import { pathToFileURL } from "node:url";
import { createApp } from "./src/app.js";

const app = createApp();
const PORT = process.env.PORT || 3002;

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  app.listen(PORT, () => {
    console.log(`Utility bill API running on port ${PORT}`);
    console.log(`Providers: http://localhost:${PORT}/api/v1/providers`);
    console.log(`Bills:     POST http://localhost:${PORT}/api/v1/{utility}/{provider}/bills`);
    console.log(`Health:    http://localhost:${PORT}/health`);
  });
}

export default app;
