import { providers } from "../providers/index.ts";

function listProviders(req, res) {
  res.json({
    success: true,
    data: providers.map((provider) => ({
      utility: provider.utility,
      code: provider.code,
      name: provider.name,
      label: provider.label,
      implemented: provider.implemented,
      account: provider.account,
    })),
  });
}

export { listProviders };
