import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { parseBillHtml } from "./parseSngplHtml.js";
import { upstream } from "../../http/errors.js";
import { buildSnapshot, documentFrom, parseAmount } from "../../domain/snapshot.js";

const BILL_URL = "https://www.sngpl.com.pk/viewbill";
const BASE_URL = "https://www.sngpl.com.pk/";

const KNOWN_ERRORS = {
  "Bill is not available for this consumer.": ["bill_unavailable", 404],
  "Incorrect Consumer Number": ["incorrect_consumer", 400],
  "Invalid Captcha": ["invalid_captcha", 400],
  "Login required to view bill. Please Login / Register": ["login_required", 403],
};

function httpConfig() {
  const config = {
    timeout: 30000,
    validateStatus: () => true,
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
    },
  };
  if (process.env.PROXY_URL) {
    config.httpsAgent = new HttpsProxyAgent(process.env.PROXY_URL);
    config.proxy = false;
  }
  return config;
}

function classify(body) {
  const text = String(body || "").trim();
  if (!text) {
    const error = new Error("Bill is not available for this consumer.");
    error.code = "bill_unavailable";
    error.status = 404;
    throw error;
  }
  const known = KNOWN_ERRORS[text];
  if (known) {
    const error = new Error(text);
    error.code = known[0];
    error.status = known[1];
    throw error;
  }
  if (!/SNGPL\s*-\s*Web Bill|<html/i.test(text)) {
    throw upstream("unexpected_response", "Unexpected response from SNGPL");
  }
  return text;
}

function amountMap(charges) {
  const keys = [
    "gasCharges",
    "provisionalBillAdjustment",
    "meterRent",
    "fixedCharges",
    "gst",
    "rebate",
    "securityDeposit",
    "currentBill",
    "latePaymentSurcharge",
    "totalAmountDue",
  ];
  const mapped = {};
  for (const key of keys) mapped[key] = parseAmount(charges[key]);
  if (charges.arrears != null) mapped.arrears = parseAmount(charges.arrears);
  return mapped;
}

async function fetchBill(provider, account, { includeDocument = false } = {}) {
    let response;
    try {
      const params = new URLSearchParams({
        proc: "viewbill",
        consumer: account,
        contype: "NewCon",
        client: "ANDROID",
      });
      response = await axios.get(`${BILL_URL}?${params.toString()}`, httpConfig());
    } catch (cause) {
      const error = upstream("upstream_error", "Could not reach SNGPL");
      error.cause = cause;
      throw error;
    }

    const html = classify(
      typeof response.data === "string" ? response.data : String(response.data || "")
    );
    const parsed = parseBillHtml(html);
    const meter = parsed.meter || {};
    const charges = parsed.charges || {};

    return buildSnapshot({
      utility: "gas",
      provider,
      account,
      source: provider.code,
      document: includeDocument ? documentFrom(html, BASE_URL) : null,
      fields: {
        billingMonth: parsed.billingMonth,
        issueDate: parsed.issueDate,
        dueDate: parsed.dueDate,
        payableWithinDueDate: parsed.payableWithinDueDate,
        payableAfterDueDate: parsed.payableAfterDueDate,
        lastReading: parsed.lastReading,
        previousReading: meter.previousReading,
        units: meter.gasConsumedHm3,
        charges: amountMap(charges),
        meter: {
          number: meter.number || null,
          currentReading: meter.currentReading || null,
          previousReading: meter.previousReading || null,
          currentReadingDate: meter.currentReadingDate || null,
          previousReadingDate: meter.previousReadingDate || null,
          difference: meter.difference || null,
        },
        history: parsed.history || [],
        customer: {
          name: parsed.name,
          address: parsed.address,
        },
        details: {
          tariff: parsed.tariff || null,
          cnic: parsed.cnic || null,
          gcv: meter.gcv ?? null,
          mmbtu: meter.mmbtu ?? null,
          pressureFactor: meter.pressureFactor || null,
          lastReadingDate: parsed.lastReadingDate || null,
          security: charges.securityOnBill || null,
          arrearsAging: charges.arrearsAging || null,
        },
      },
    });
}

export { fetchBill };
