const MONTHS = {
  JAN: "01",
  FEB: "02",
  MAR: "03",
  APR: "04",
  MAY: "05",
  JUN: "06",
  JUL: "07",
  AUG: "08",
  SEP: "09",
  OCT: "10",
  NOV: "11",
  DEC: "12",
};

function todayInPakistan(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function parseAmount(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const match = String(value).replace(/,/g, "").trim().match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function dueDateIso(value) {
  const text = String(value || "").trim();
  const dmy = text.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;

  const named = text.match(/^(\d{1,2})[-\s]([A-Za-z]{3})[-\s](\d{2}|\d{4})$/);
  if (!named) return null;
  const month = MONTHS[named[2].toUpperCase()];
  if (!month) return null;
  const year = named[3].length === 2 ? `20${named[3]}` : named[3];
  return `${year}-${month}-${named[1].padStart(2, "0")}`;
}

function billStatus(payable, dueDate, today = todayInPakistan()) {
  if (payable == null) return null;
  if (payable <= 0) return "paid";
  const due = dueDateIso(dueDate);
  if (due && today > due) return "overdue";
  return "pending";
}

function textOrNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function buildSnapshot({
  utility,
  provider,
  account,
  fields,
  document,
  source,
}) {
  const payableWithinDueDate = parseAmount(fields.payableWithinDueDate);
  const payableAfterDueDate = parseAmount(fields.payableAfterDueDate);

  return {
    data: {
      utility,
      provider: {
        code: provider.code,
        name: provider.name,
      },
      account,
      billingMonth: textOrNull(fields.billingMonth),
      issueDate: textOrNull(fields.issueDate),
      dueDate: textOrNull(fields.dueDate),
      currency: "PKR",
      payableWithinDueDate,
      payableAfterDueDate,
      status: billStatus(payableWithinDueDate, fields.dueDate),
      lastReading: textOrNull(fields.lastReading),
      previousReading: textOrNull(fields.previousReading),
      units: parseAmount(fields.units),
      charges: fields.charges || {},
      meter: fields.meter || {},
      history: Array.isArray(fields.history) ? fields.history : [],
      customer: {
        name: textOrNull(fields.customer && fields.customer.name),
        address: textOrNull(fields.customer && fields.customer.address),
      },
      details: fields.details || {},
      document: document || null,
    },
    meta: {
      fetchedAt: new Date().toISOString(),
      source,
    },
  };
}

function documentFrom(html, baseUrl) {
  if (!html) return null;
  return {
    mimeType: "text/html",
    encoding: "utf-8",
    baseUrl,
    content: html,
  };
}

module.exports = {
  todayInPakistan,
  parseAmount,
  dueDateIso,
  billStatus,
  buildSnapshot,
  documentFrom,
};
