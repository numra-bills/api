import * as cheerio from "cheerio";
import { parseAmount } from "../../domain/snapshot.js";

const BASE_URL = "https://bill.pitc.com.pk/";

function ownText($, el) {
  return $(el).text().replace(/\s+/g, " ").trim();
}

function labelValues($) {
  const values = {};
  $(".en-lbl").each((_, el) => {
    const label = ownText($, el).replace(/\s+/g, " ").toUpperCase();
    const valueEl = $(el).closest(".label-row").next(".val-space");
    if (!label || !valueEl.length || values[label]) return;
    const value = ownText($, valueEl);
    values[label] = value || null;
  });
  return values;
}

function panelValue($, label) {
  let found = null;
  $(".right-panel-en").each((_, el) => {
    const text = ownText($, el).toUpperCase();
    if (!text.includes(label)) return;
    const cell = $(el).closest(".right-grid-cell, .right-section-cell");
    const value = ownText($, cell.find(".right-panel-date-val, .right-main-val").first());
    if (value) found = value;
  });
  return found;
}

function lateBoxes($) {
  const boxes = [];
  $(".slip-late-box").each((_, el) => {
    const text = $(el)
      .html()
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const match = text.match(/(Till|After)\s+(\d{2}-[A-Za-z]{3}-\d{2})\s*([\d,]+)/i);
    if (!match) return;
    boxes.push({
      kind: match[1].toLowerCase(),
      date: match[2].toUpperCase(),
      amount: parseAmount(match[3]),
    });
  });
  return boxes;
}

function chargeRows($) {
  const rows = {};
  $(".charges-bd-row").each((_, el) => {
    const label = ownText($, $(el).find(".charges-bd-en").first());
    const value = ownText($, $(el).find(".charges-bd-val").first());
    if (label) rows[label] = value || null;
  });
  return rows;
}

function historyRows($) {
  const rows = [];
  $(".history-row").each((_, el) => {
    const cells = $(el)
      .children()
      .map((__, cell) => ownText($, cell))
      .get();
    if (!/^[A-Za-z]{3}\d{2}$/.test(cells[0] || "")) return;
    const units = parseAmount(cells[2]);
    const bill = parseAmount(cells[3]);
    const payment = parseAmount(cells[4]);
    let status = null;
    if (bill != null && payment != null) {
      if (bill <= 0 || payment + 0.009 >= bill) status = "paid";
      else if (payment <= 0) status = "unpaid";
      else status = "partial";
    }
    rows.push({
      month: cells[0],
      units,
      bill,
      payment,
      status,
    });
  });
  return rows;
}

function splitNameAddress(value) {
  const text = String(value || "").trim();
  if (!text) return { name: null, address: null };
  const comma = text.indexOf(",");
  if (comma === -1) return { name: text, address: null };
  return {
    name: text.slice(0, comma).trim() || null,
    address: text.slice(comma + 1).trim() || null,
  };
}

function prepareDocument(html) {
  let output = String(html || "").replace(/charset\s*=\s*["']utf-16["']/i, 'charset="utf-8"');
  if (!/<base\s/i.test(output)) {
    output = output.replace(/<head[^>]*>/i, (head) => `${head}<base href="${BASE_URL}">`);
  }
  return output;
}

function parsePitcHtml(html) {
  const $ = cheerio.load(html);
  const labels = labelValues($);
  const charges = chargeRows($);
  const payableWithinDueDate =
    parseAmount(ownText($, $(".payable-card-amount").first())) ??
    parseAmount(charges["Grand Total"]);
  const presentReading = labels["PRESENT READING"];

  if (!presentReading && payableWithinDueDate == null) return null;

  const late = lateBoxes($);
  const till = late.find((box) => box.kind === "till");
  const after = late.find((box) => box.kind === "after");
  const person = splitNameAddress(labels["NAME & ADDRESS"]);

  return {
    html: prepareDocument($.html()),
    fields: {
      billingMonth: panelValue($, "BILL MONTH"),
      issueDate: panelValue($, "ISSUE DATE"),
      dueDate: panelValue($, "DUE DATE"),
      payableWithinDueDate,
      payableAfterDueDate: till ? till.amount : after ? after.amount : null,
      lastReading: presentReading,
      previousReading: labels["PREVIOUS READING"],
      units: labels.UNITS,
      charges: {
        totalAmount: parseAmount(charges["Grand Total"]),
        amountAfterDueDate: till ? till.amount : null,
        electricityCharges: parseAmount(charges["Total Electricity Charges"]),
        gst: parseAmount(charges.Taxes),
        displayAmount: payableWithinDueDate,
        subsidies: parseAmount(charges.Subsidies),
        netElectricityCharges: parseAmount(charges["Net Electricity Charges"]),
        currentBill: parseAmount(charges["Current Bill"]),
        totalFpa: parseAmount(charges["Total FPA"]),
      },
      meter: {
        number: labels["METER NO"] || null,
        multiplyingFactor: labels.MF || null,
        currentReading: presentReading || null,
        previousReading: labels["PREVIOUS READING"] || null,
      },
      history: historyRows($),
      customer: person,
      details: {
        tariff: labels.TARIFF || null,
        customerId: labels["CONSUMER ID"] || null,
        readingDate: panelValue($, "READING DATE"),
        referenceNo: labels["REFERENCE NO"] || null,
        category: labels.CATEGORY || null,
        tariffCategory: labels["TARIFF CATEGORY"] || null,
        subdivision: labels["SUB DIVISION"] || null,
        sanctionedLoad: labels["SAN LOAD"] || null,
        arrears: charges.Arrears || null,
        installment: parseAmount(charges.Installment),
        adjustments: parseAmount(charges.Adjustments),
        payableTillDate: till ? till.date : null,
        payableTillAmount: till ? till.amount : null,
        payableAfterLateDate: after ? after.date : null,
        payableAfterLateAmount: after ? after.amount : null,
      },
    },
  };
}

export { BASE_URL, prepareDocument, parsePitcHtml };
