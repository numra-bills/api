const registry = require("../providers/registry");
const { badRequest, notFound, notImplemented } = require("../http/errors");
const { sendSuccess } = require("../http/response");

const UTILITIES = new Set(["electricity", "gas"]);

async function createBill(req, res, next) {
  try {
    const utility = String(req.params.utility || "").toLowerCase();
    const code = String(req.params.provider || "").toLowerCase();

    if (!UTILITIES.has(utility)) {
      throw notFound("provider_not_found", `Unknown utility "${utility}"`);
    }

    const provider = registry.get(utility, code);
    if (!provider) {
      throw notFound("provider_not_found", `Unknown provider "${code}"`);
    }

    const body = req.body || {};
    if (body.account == null || String(body.account).trim() === "") {
      throw badRequest("account_required", "account is required");
    }

    const account = provider.validateAccount(body.account);
    if (provider.implemented === false) {
      throw notImplemented(`${provider.name} is not available yet`);
    }

    const includeDocument = body.includeDocument === true || body.includeDocument === "true";
    const snapshot = await provider.fetchBill(account, { includeDocument });
    return sendSuccess(res, snapshot.data, snapshot.meta);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createBill,
};
