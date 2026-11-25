import { providers } from "../providers/index.ts";
import { badRequest, notFound, notImplemented } from "../http/errors.js";
import { sendSuccess } from "../http/response.js";
import { checkOne } from "../providers/fields.js";

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

    const account = checkOne(provider, body.account);
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
