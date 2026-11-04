const sngpl = require("./gas/sngpl");
const ssgc = require("./gas/ssgc");

const providers = new Map();

function register(provider) {
  providers.set(`${provider.utility}:${provider.code}`, provider);
}

register(sngpl);
register(ssgc);

function get(utility, code) {
  return providers.get(`${String(utility).toLowerCase()}:${String(code).toLowerCase()}`) || null;
}

function list() {
  return [...providers.values()].map((provider) => ({
    utility: provider.utility,
    code: provider.code,
    name: provider.name,
    implemented: provider.implemented !== false,
  }));
}

module.exports = {
  get,
  list,
};
