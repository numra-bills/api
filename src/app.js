const express = require("express");
const v1 = require("./routes/v1");
const { sendError } = require("./http/response");

function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.get("/health", (req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/", (req, res) => {
    res.json({
      status: "online",
      service: "Utility Bill API",
      version: "1.0.0",
      endpoints: {
        providers: "GET /api/v1/providers",
        bills: "POST /api/v1/{utility}/{provider}/bills",
        health: "GET /health",
      },
    });
  });

  app.use("/api/v1", v1);

  app.use((req, res) => {
    sendError(res, {
      status: 404,
      code: "not_found",
      message: "Endpoint not found",
    });
  });

  app.use((err, req, res, next) => {
    if (!err.status || err.status >= 500) console.error(err.message);
    sendError(res, err);
  });

  return app;
}

module.exports = {
  createApp,
};
