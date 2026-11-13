import { pathToFileURL } from "node:url";
import { createApp } from "./src/app.js";
import { migrate } from "./src/db/migrate.js";

const app = createApp();
const PORT = process.env.PORT || 3002;

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  migrate()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Utility bill API running on port ${PORT}`);
        console.log(`Providers: http://localhost:${PORT}/api/v1/providers`);
        console.log(`Accounts:  http://localhost:${PORT}/api/v1/accounts`);
        console.log(`Bills:     POST http://localhost:${PORT}/api/v1/{utility}/{provider}/bills`);
        console.log(`Health:    http://localhost:${PORT}/health`);
      });
    })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}

export default app;
