import * as cheerio from "cheerio";

const CHARGE_LABELS = {
  "Gas Charges": "gasCharges",
  "Prov.Bill Adjustment": "provisionalBillAdjustment",
  "Meter Rent": "meterRent",
  "Fixed Charges": "fixedCharges",
  GST: "gst",
  "Rebate / Adjustment": "rebate",
  "Security Deposit": "securityDeposit",
  "Current Bill": "currentBill",
  "Arrears / Aging": "arrearsAging",
  "Late Payment Surcharge (Rs.)": "latePaymentSurcharge",
  "Total Amount Due": "totalAmountDue",
};

function parseAmount(value) {
  if (value == null) return null;
  const cleaned = String(value).replace(/,/g, "").trim();
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function parseDmy(value) {
  const match = String(value || "").trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function todayInPakistan(override) {
  if (override) return String(override).slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function openBillStatus(payable, dueDate, today) {
  if (payable == null) return "unknown";
  if (payable <= 0) return "paid";
  const due = parseDmy(dueDate);
  if (due && today > due) return "overdue";
  return "pending";
}

function historyStatus(amountDue, payment) {
  if (amountDue == null || payment == null) return "unknown";
  if (amountDue <= 0) return "paid";
  if (payment + 0.009 >= amountDue) return "paid";
  if (payment <= 0) return "unpaid";
  return "partial";
}

function ownText($, el) {
  let text = "";
  $(el).contents().each((_, node) => {
    if (node.type === "text") text += node.data;
    else if (node.type === "tag" && node.name !== "table" && node.name !== "img") {
      text += ` ${ownText($, node)}`;
    }
  });
  return text.replace(/\s+/g, " ").trim();
}

function leafRows(html) {
  const $ = cheerio.load(html);
  const rows = [];
  $("tr").each((_, tr) => {
    const cells = [];
    $(tr).children("td").each((__, td) => {
      if ($(td).children("table").length && ownText($, td) === "") return;
      cells.push(ownText($, td));
    });
    if (cells.some((cell) => cell)) rows.push(cells);
  });
  return rows;
}

function nonEmpty(cells) {
  return cells.map((cell) => cell.trim()).filter(Boolean);
}

function isMostlyArabic(value) {
  const letters = value.replace(/\s/g, "");
  if (!letters) return false;
  const arabic = letters.match(/[\u0600-\u06FF]/g);
  return Boolean(arabic && arabic.length / letters.length > 0.5);
}

function labeledValue(cells, label) {
  const items = nonEmpty(cells);
  const index = items.findIndex(
    (cell) => cell === label || cell.startsWith(`${label}:`) || cell.startsWith(`${label} `)
  );
  if (index === -1) return null;
  const cell = items[index];
  if (cell.startsWith(`${label}:`) && cell.length > label.length + 1) {
    return cell.slice(label.length + 1).trim();
  }
  for (let i = index + 1; i < items.length; i += 1) {
    if (!isMostlyArabic(items[i]) && items[i] !== label) return items[i];
  }
  return null;
}

function parseBillHtml(html, options = {}) {
  const rows = leafRows(html);
  const today = todayInPakistan(options.today);
  const charges = {};
  const history = [];
  let historyStarted = false;

  const consumer = {
    name: null,
    address: [],
    cnic: null,
    tariff: null,
    issueDate: null,
    security: null,
    zone: null,
    accountId: null,
  };

  const meter = {
    number: null,
    currentReadingDate: null,
    previousReadingDate: null,
    currentReading: null,
    previousReading: null,
    difference: null,
    pressureFactor: null,
    gasConsumedHm3: null,
    mmbtu: null,
    gcv: null,
  };

  let payableWithinDueDate = null;
  let payableAfterDueDate = null;
  let dueDate = null;
  let billingMonth = null;
  let capturingAddress = false;

  for (const cells of rows) {
    const items = nonEmpty(cells);
    if (!items.length) continue;
    const first = items[0];

    if (first.startsWith("Name:")) {
      consumer.name = labeledValue(cells, "Name");
      capturingAddress = false;
      continue;
    }

    if (first.startsWith("Address:")) {
      const line = labeledValue(cells, "Address");
      consumer.address = line ? [line] : [];
      capturingAddress = true;
      continue;
    }

    if (capturingAddress) {
      if (
        first.startsWith("Consumer") ||
        first.startsWith("Tariff:") ||
        first.startsWith("Zone/") ||
        first.startsWith("Issue Date")
      ) {
        capturingAddress = false;
      } else if (items.length === 1 && !isMostlyArabic(first) && first.length < 80) {
        consumer.address.push(first);
        continue;
      } else {
        capturingAddress = false;
      }
    }

    if (first.startsWith("Consumer's CNIC")) {
      consumer.cnic = first.split(":").slice(1).join(":").trim() || null;
    }

    if (first.startsWith("Tariff:")) {
      consumer.tariff = first.replace(/^Tariff:\s*/, "") || null;
    }

    const issueCell = items.find((cell) => cell.startsWith("Issue Date:"));
    if (issueCell) consumer.issueDate = issueCell.replace(/^Issue Date:\s*/, "");

    const securityCell = items.find((cell) => cell.startsWith("Security:"));
    if (securityCell) consumer.security = securityCell.replace(/^Security:\s*/, "");

    if (first.startsWith("Zone/")) {
      consumer.zone = items.find((cell) => cell !== first) || null;
    }

    if (first === "Account ID" && !consumer.accountId) {
      consumer.accountId = labeledValue(cells, "Account ID");
    }

    if (first === "Billing Month") {
      billingMonth = labeledValue(cells, "Billing Month");
    }

    if (/^[A-Z]{1,3}\d{6,}$/.test(first) && !meter.number) {
      meter.number = first;
    }

    if (first === "Dates:" || first.startsWith("Dates:")) {
      const dates = items.filter((cell) => /^\d{2}-\d{2}-\d{4}$/.test(cell));
      meter.currentReadingDate = dates[0] || null;
      meter.previousReadingDate = dates[1] || null;
    }

    if (first === "Reading:" || first.startsWith("Reading:")) {
      const readings = items.filter((cell) => /^\d{4,}$/.test(cell));
      meter.currentReading = readings[0] || null;
      meter.previousReading = readings[1] || null;
      meter.difference = readings[2] || null;
    }

    if (first.startsWith("Pres.")) {
      const factor = items.find((cell) => /^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/.test(cell));
      meter.pressureFactor = factor || null;
      const hm3Index = items.findIndex((cell) => /HM3/i.test(cell));
      if (hm3Index !== -1) meter.gasConsumedHm3 = parseAmount(items[hm3Index + 1]);
    }

    if (first.startsWith("Temp.")) {
      const mmbtuIndex = items.findIndex((cell) => /MMBTU/i.test(cell));
      if (mmbtuIndex !== -1) meter.mmbtu = parseAmount(items[mmbtuIndex + 1]);
    }

    if (items.includes("GCV")) {
      const gcvIndex = items.indexOf("GCV");
      meter.gcv = parseAmount(items[gcvIndex + 1]);
    }

    if (CHARGE_LABELS[first]) {
      const amountCell = [...items].reverse().find((cell) =>
        /^-?[\d,]+(?:\.\d+)?(?:\/[\d,]+(?:\.\d+)?)?$/.test(cell)
      );
      charges[CHARGE_LABELS[first]] = amountCell || null;
    }

    if (items[0] === "Month" && items.includes("Payment")) {
      historyStarted = true;
      continue;
    }

    if (historyStarted) {
      if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}$/.test(first) && items.length >= 5) {
        const amountDue = parseAmount(items[3]);
        const payment = parseAmount(items[4]);
        history.push({
          month: items[0],
          hm3: parseAmount(items[1]),
          currentBill: parseAmount(items[2]),
          amountDue,
          payment,
          status: historyStatus(amountDue, payment),
        });
      } else if (first.startsWith("Minimum") || first.startsWith("DOMP") || first === "Slab") {
        historyStarted = false;
      }
    }

    if (
      items.length >= 3 &&
      /^\d{2}-\d{2}-\d{4}$/.test(items[2]) &&
      parseAmount(items[0]) != null &&
      parseAmount(items[1]) != null
    ) {
      payableWithinDueDate = parseAmount(items[0]);
      payableAfterDueDate = parseAmount(items[1]);
      dueDate = items[2];
    }
  }

  if (!billingMonth) {
    const month = rows
      .flat()
      .find((cell) => /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}$/.test(cell.trim()));
    billingMonth = month ? month.trim() : null;
  }

  const totalDue = parseAmount(charges.totalAmountDue);
  const payable = payableWithinDueDate != null ? payableWithinDueDate : totalDue;
  const status = openBillStatus(payable, dueDate, today);

  if (!consumer.accountId && !meter.currentReading && payable == null) {
    const error = new Error("Could not read bill fields from SNGPL HTML");
    error.code = "parse_error";
    error.status = 502;
    throw error;
  }

  return {
    accountId: consumer.accountId,
    name: consumer.name,
    address: consumer.address.join(", "),
    cnic: consumer.cnic,
    tariff: consumer.tariff,
    billingMonth,
    issueDate: consumer.issueDate,
    dueDate,
    payableWithinDueDate: payable,
    payableAfterDueDate,
    status,
    lastReading: meter.currentReading,
    lastReadingDate: meter.currentReadingDate,
    meter,
    charges: {
      ...charges,
      gasCharges: parseAmount(charges.gasCharges),
      provisionalBillAdjustment: parseAmount(charges.provisionalBillAdjustment),
      meterRent: parseAmount(charges.meterRent),
      fixedCharges: parseAmount(charges.fixedCharges),
      gst: parseAmount(charges.gst),
      rebate: parseAmount(charges.rebate),
      securityDeposit: parseAmount(charges.securityDeposit),
      currentBill: parseAmount(charges.currentBill),
      arrearsAging: charges.arrearsAging || null,
      arrears: parseAmount(charges.arrearsAging),
      latePaymentSurcharge: parseAmount(charges.latePaymentSurcharge),
      totalAmountDue: totalDue,
      securityOnBill: consumer.security,
    },
    history,
  };
}

export { parseBillHtml };
