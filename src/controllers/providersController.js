const registry = require("../providers/registry");

function listProviders(req, res) {
  res.json({
    success: true,
    data: registry.list(),
  });
}

module.exports = {
  listProviders,
};
