import { providers } from "../providers/index.ts";
import { badRequest, notFound, notImplemented } from "../http/errors.js";
import { sendSuccess } from "../http/response.js";

function accountMessage(min, max) {
  if (min === max) return `Account must be ${min} digits`;
  if (max === min + 1) return `Account must be ${min} or ${max} digits`;
  return `Account must be ${min} to ${max} digits`;
}

function checkAccount(provider, account) {
  const value = String(account || "").trim();
  const { min, max } = provider.account;
  if (!new RegExp(`^\\d{${min},${max}}$`).test(value)) {
    throw badRequest("invalid_account", accountMessage(min, max));
  }
  return value;
}

async function createBill(req, res, next) {
  try {
    const utility = String(req.params.utility || "").toLowerCase();
    const code = String(req.params.provider || "").toLowerCase();
    const provider = providers.find((item) => item.utility === utility && item.code === code);

    if (!provider) {
      const knownUtility = providers.some((item) => item.utility === utility);
      throw notFound(
        "provider_not_found",
        knownUtility ? `Unknown provider "${code}"` : `Unknown utility "${utility}"`
      );
    }

    const body = req.body || {};
    if (body.account == null || String(body.account).trim() === "") {
      throw badRequest("account_required", "account is required");
    }

    const account = checkAccount(provider, body.account);
    if (provider.implemented === false) {
      throw notImplemented(`${provider.name} is not available yet`);
    }

    const includeDocument = body.includeDocument === true || body.includeDocument === "true";
    const snapshot = await provider.fetch(provider, account, { includeDocument });
    return sendSuccess(res, snapshot.data, snapshot.meta);
  } catch (error) {
    return next(error);
  }
}

export { createBill };
