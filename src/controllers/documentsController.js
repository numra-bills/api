import { findAccount } from "../accounts/store.js";
import { ensureDocument } from "../bills/document.js";
import { notFound } from "../http/errors.js";
import { sendSuccess } from "../http/response.js";

async function getAccountDocument(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw notFound("account_not_found", "Saved bill not found.");
    const account = await findAccount(req.uid, id);
    if (!account) throw notFound("account_not_found", "Saved bill not found.");
    const document = await ensureDocument(account.provider, account.reference_no);
    sendSuccess(res, {
      mimeType: document.mimeType,
      encoding: document.encoding,
      baseUrl: document.baseUrl,
      content: document.content,
    });
  } catch (error) {
    next(error);
  }
}

export { getAccountDocument };
