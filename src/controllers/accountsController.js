import { providers } from "../providers/index.ts";
import { badRequest, notFound } from "../http/errors.js";
import { sendSuccess } from "../http/response.js";
import { deleteAccount, insertAccount, listAccounts, updateAccount } from "../accounts/store.js";

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

function present(row) {
  const provider = providers.find((item) => item.code === row.provider);
  return {
    id: String(row.id),
    providerId: row.provider,
    providerName: provider ? provider.name : row.provider,
    kind: provider ? provider.utility : null,
    category: row.category,
    referenceNo: row.reference_no,
    tag: row.tag,
  };
}

async function getAccounts(req, res, next) {
  try {
    const rows = await listAccounts(req.uid);
    sendSuccess(res, rows.map(present));
  } catch (error) {
    next(error);
  }
}

async function postAccount(req, res, next) {
  try {
    const row = await insertAccount(req.uid, readAccount(req.body || {}));
    sendSuccess(res, present(row));
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
    sendSuccess(res, present(row));
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
