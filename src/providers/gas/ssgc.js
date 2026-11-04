const { badRequest } = require("../../http/errors");

module.exports = {
  utility: "gas",
  code: "ssgc",
  name: "Sui Southern Gas Company",
  implemented: false,
  validateAccount(account) {
    const value = String(account || "").trim();
    if (!/^\d{10,12}$/.test(value)) {
      throw badRequest("invalid_account", "Account must be 10 to 12 digits");
    }
    return value;
  },
};
