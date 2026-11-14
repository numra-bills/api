import { providers } from "../providers/index.ts";
import { badRequest, notFound } from "../http/errors.js";
import { sendSuccess } from "../http/response.js";
import { billStatus } from "../domain/snapshot.js";
import { deleteAccount, insertAccount, listAccounts, updateAccount } from "../accounts/store.js";
import { ensureBill } from "../bills/ensure.js";
import { latestReadings } from "../readings/store.js";
import { asNumber } from "./readingsController.js";

const categories = new Set(["Home", "Office", "Shop", "Other"]);

function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

function readAccount(body) {
  const code = String(body.provider || "").trim().toLowerCase();
  const provider = providers.find((item) => item.code === code);
  if (!provider) throw badRequest("invalid_provider", "Choose a provider.");
  const referenceNo = digits(body.referenceNo);
  if (!referenceNo) throw badRequest("reference_required", "Enter a reference number.");
  const { min, max } = provider.account;
  if (referenceNo.length < min || referenceNo.length > max) {
    throw badRequest("invalid_account", `Reference must be ${min} to ${max} digits.`);
  }
  const category = String(body.category || "");
  if (!categories.has(category)) throw badRequest("invalid_category", "Choose a category.");
  const tag = String(body.tag || "").trim().slice(0, 16);
  return {
    provider: provider.code,
    referenceNo,
    category,
    tag: tag || null,
  };
}

function money(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function presentBill(row) {
  if (!row) return null;
  const payableWithinDueDate = money(row.payable_within_due_date);
  return {
    billingMonth: row.billing_month,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    payableWithinDueDate,
    payableAfterDueDate: money(row.payable_after_due_date),
    status: billStatus(payableWithinDueDate, row.due_date),
    currency: row.currency,
    meterReading: asNumber(row.last_reading),
  };
}

async function withBill(account, reading) {
  const { row } = await ensureBill(account.provider, account.reference_no);
  return present(account, row, reading);
}

function presentReading(row) {
  if (!row) return null;
  return {
    value: Number(row.reading),
    enteredAt: new Date(row.entered_at).toISOString(),
  };
}

function present(row, bill, reading) {
  const provider = providers.find((item) => item.code === row.provider);
  return {
    id: String(row.id),
    providerId: row.provider,
    providerName: provider ? provider.name : row.provider,
    kind: provider ? provider.utility : null,
    category: row.category,
    referenceNo: row.reference_no,
    tag: row.tag,
    bill: presentBill(bill),
    reading: presentReading(reading),
  };
}

async function getAccounts(req, res, next) {
  try {
    const rows = await listAccounts(req.uid);
    const readings = new Map((await latestReadings(req.uid)).map((row) => [String(row.account_id), row]));
    const data = [];
    for (const row of rows) data.push(await withBill(row, readings.get(String(row.id))));
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

async function postAccount(req, res, next) {
  try {
    const row = await insertAccount(req.uid, readAccount(req.body || {}));
    sendSuccess(res, await withBill(row));
  } catch (error) {
    next(error);
  }
}

async function patchAccount(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw notFound("account_not_found", "Saved bill not found.");
    const row = await updateAccount(req.uid, id, readAccount(req.body || {}));
    if (!row) throw notFound("account_not_found", "Saved bill not found.");
    sendSuccess(res, await withBill(row));
  } catch (error) {
    next(error);
  }
}

async function removeAccount(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw notFound("account_not_found", "Saved bill not found.");
    const removed = await deleteAccount(req.uid, id);
    if (!removed) throw notFound("account_not_found", "Saved bill not found.");
    sendSuccess(res, { id: String(id) });
  } catch (error) {
    next(error);
  }
}

export { getAccounts, postAccount, patchAccount, removeAccount };
