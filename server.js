const { createApp } = require("./src/app");

const app = createApp();
const PORT = process.env.PORT || 3002;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Utility bill API running on port ${PORT}`);
    console.log(`Providers: http://localhost:${PORT}/api/v1/providers`);
    console.log(`Bills:     POST http://localhost:${PORT}/api/v1/{utility}/{provider}/bills`);
    console.log(`Health:    http://localhost:${PORT}/health`);
  });
}

module.exports = app;
