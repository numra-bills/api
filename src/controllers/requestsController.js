import { badRequest } from "../http/errors.js";
import { sendSuccess } from "../http/response.js";
import { insertRequest, listRequests } from "../requests/store.js";

const utilities = new Set(["electricity", "gas", "water", "internet", "other"]);

function text(value, max) {
  return String(value || "").trim().slice(0, max);
}

function present(row) {
  return {
    id: String(row.id),
    providerName: row.provider_name,
    utility: row.utility,
    city: row.city,
    notes: row.notes,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

async function getRequests(req, res, next) {
  try {
    const rows = await listRequests(req.uid);
    sendSuccess(res, rows.map(present));
  } catch (error) {
    next(error);
  }
}

async function postRequest(req, res, next) {
  try {
    const body = req.body || {};
    const providerName = text(body.providerName, 80);
    if (!providerName) throw badRequest("name_required", "Enter the provider name.");
    const utility = String(body.utility || "").trim();
    if (!utilities.has(utility)) throw badRequest("invalid_utility", "Choose a bill type.");
    const row = await insertRequest(req.uid, {
      providerName,
      utility,
      city: text(body.city, 80) || null,
      notes: text(body.notes, 500) || null,
    });
    sendSuccess(res, present(row));
  } catch (error) {
    next(error);
  }
}

export { getRequests, postRequest };
