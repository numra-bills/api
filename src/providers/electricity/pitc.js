import axios from "axios";
import * as cheerio from "cheerio";
import { HttpsProxyAgent } from "https-proxy-agent";
import { notFound, upstream } from "../../http/errors.js";
import { buildSnapshot, documentFrom, parseAmount } from "../../domain/snapshot.js";
import { BASE_URL, prepareDocument, parsePitcHtml } from "./parsePitcHtml.js";

// Shared PITC portal: https://bill.pitc.com.pk/{code}bill
// A company with its own site, such as K-Electric, is a separate file.

function legacyFields(data) {
  const consumer = data.consumerDetails || {};
  const bill = data.billDetails || {};
  const charges = data.charges || {};
  const payableWithinDueDate =
    parseAmount(charges.totalAmount) ?? parseAmount(charges.displayAmount);

  return {
    billingMonth: null,
    issueDate: bill.issueDate,
    dueDate: bill.dueDate,
    payableWithinDueDate,
    payableAfterDueDate: charges.amountAfterDueDate,
    lastReading: bill.currentReading,
    previousReading: bill.previousReading,
    units: bill.unitsConsumed,
    charges: {
      totalAmount: parseAmount(charges.totalAmount),
      amountAfterDueDate: parseAmount(charges.amountAfterDueDate),
      electricityCharges: parseAmount(charges.electricityCharges),
      gst: parseAmount(charges.gst),
      displayAmount: parseAmount(charges.displayAmount),
    },
    meter: {
      currentReading: bill.currentReading || null,
      previousReading: bill.previousReading || null,
    },
    history: [],
    customer: {
      name: consumer.name,
      address: consumer.address,
    },
    details: {
      tariff: bill.tariff || null,
      customerId: consumer.customerId || null,
      readingDate: bill.readingDate || null,
    },
  };
}

async function fetchBill(provider, account, { includeDocument = false } = {}) {
  const result = await getPITCBill(account, provider.code);
  if (!result.success) {
    const message = result.error || "Electricity bill request failed";
    if (/timeout|unable to connect|failed to extract required tokens/i.test(message)) {
      throw upstream("upstream_error", message);
    }
    throw notFound("bill_not_found", message);
  }

  const data = result.data || {};
  const parsed = parsePitcHtml(data.rawHtml || "");
  const html = prepareDocument(parsed ? parsed.html : data.rawHtml || "");
  const fields = parsed ? parsed.fields : legacyFields(data);

  return buildSnapshot({
    utility: "electricity",
    provider,
    account,
    source: provider.code,
    document: includeDocument ? documentFrom(html, BASE_URL) : null,
    fields,
  });
}

async function getPITCBill(refNo, companyCode) {
  try {
    const code = String(companyCode || "").trim().toLowerCase();
    if (!/^[a-z0-9]+$/.test(code)) {
      return { success: false, error: "Invalid company code" };
    }

    const baseUrl = `https://bill.pitc.com.pk/${code}bill`;
    const proxyUrl = process.env.PROXY_URL;
    const axiosConfig = {
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    };

    if (proxyUrl) {
      axiosConfig.httpsAgent = new HttpsProxyAgent(proxyUrl);
      axiosConfig.proxy = false;
    }

    const getResponse = await axios.get(baseUrl, axiosConfig);
    const $ = cheerio.load(getResponse.data);

    const viewState = $("#__VIEWSTATE").val();
    const viewStateGenerator = $("#__VIEWSTATEGENERATOR").val();
    const eventValidation = $("#__EVENTVALIDATION").val();
    const requestVerificationToken = $(
      'input[name="__RequestVerificationToken"]'
    ).val();

    if (!viewState || !viewStateGenerator || !eventValidation) {
      return {
        success: false,
        error: "Failed to extract required tokens from PITC portal",
      };
    }

    const formData = new URLSearchParams({
      __VIEWSTATE: viewState,
      __VIEWSTATEGENERATOR: viewStateGenerator,
      __EVENTVALIDATION: eventValidation,
      __RequestVerificationToken: requestVerificationToken,
      rbSearchByList: "refno",
      searchTextBox: refNo,
      ruCodeTextBox: "",
      btnSearch: "Search",
    });

    const postConfig = {
      timeout: 30000,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Referer: baseUrl,
        Cookie: getResponse.headers["set-cookie"]?.join("; ") || "",
      },
      maxRedirects: 5,
    };

    if (proxyUrl) {
      postConfig.httpsAgent = new HttpsProxyAgent(proxyUrl);
      postConfig.proxy = false;
    }

    const postResponse = await axios.post(baseUrl, formData.toString(), postConfig);
    const $result = cheerio.load(postResponse.data);

    const errorDiv = $result("#ua").text().trim();
    if (errorDiv) {
      return {
        success: false,
        error: errorDiv,
        refNo,
        company: code,
      };
    }

    return {
      success: true,
      refNo,
      company: code,
      data: parseBillDetails($result, refNo, code),
    };
  } catch (error) {
    if (
      error.code === "ECONNABORTED" ||
      error.code === "UND_ERR_CONNECT_TIMEOUT"
    ) {
      return {
        success: false,
        error: "Connection timeout - PITC server may be geo-restricted or down",
      };
    }

    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      return {
        success: false,
        error: "Unable to connect to PITC server",
      };
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

function parseBillDetails($, refNo, companyCode) {
  const billData = {
    referenceNumber: refNo,
    company: companyCode,
    consumerDetails: {},
    billDetails: {},
    charges: {},
    rawHtml: null,
  };

  try {
    const tableRows = $("table tr");

    tableRows.each((index, element) => {
      const cells = $(element).find("td");
      if (cells.length >= 2) {
        const label = $(cells[0]).text().trim().toLowerCase();
        const value = $(cells[1]).text().trim();

        if (label.includes("consumer") || label.includes("name")) {
          billData.consumerDetails.name = value;
        } else if (label.includes("address")) {
          billData.consumerDetails.address = value;
        } else if (label.includes("customer") || label.includes("id")) {
          billData.consumerDetails.customerId = value;
        } else if (label.includes("tariff")) {
          billData.billDetails.tariff = value;
        } else if (label.includes("due date")) {
          billData.billDetails.dueDate = value;
        } else if (
          label.includes("issue date") ||
          label.includes("bill date")
        ) {
          billData.billDetails.issueDate = value;
        } else if (label.includes("reading date")) {
          billData.billDetails.readingDate = value;
        } else if (label.includes("current reading")) {
          billData.billDetails.currentReading = value;
        } else if (label.includes("previous reading")) {
          billData.billDetails.previousReading = value;
        } else if (label.includes("units") || label.includes("consumption")) {
          billData.billDetails.unitsConsumed = value;
        } else if (
          label.includes("amount payable") ||
          label.includes("total amount")
        ) {
          billData.charges.totalAmount = value;
        } else if (label.includes("after due date")) {
          billData.charges.amountAfterDueDate = value;
        } else if (label.includes("electricity charges")) {
          billData.charges.electricityCharges = value;
        } else if (label.includes("gst") || label.includes("tax")) {
          billData.charges.gst = value;
        }
      }
    });

    const billAmountElement = $('[id*="amount"], [class*="amount"]').first();
    if (billAmountElement.length) {
      billData.charges.displayAmount = billAmountElement.text().trim();
    }

    billData.rawHtml = $.html();
  } catch (parseError) {
    console.error("Error parsing bill details:", parseError.message);
    billData.parseError = parseError.message;
  }

  return billData;
}

export { fetchBill };
