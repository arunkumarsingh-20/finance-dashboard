const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./docs/swagger");


const apiRoutes = require("./routes");
const { requestId } = require("./middleware/requestId");
const config = require("./config");

const { mockAuth } = require("./middleware/auth");
const { rateLimit } = require("./middleware/rateLimit");
const authRoutes = require("./routes/auth");

const { AppError } = require("./utils/errors");

const app = express();

app.use(requestId);

app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN, credentials: false }));
app.use(morgan("dev"));
app.use(express.json());

// Public health check
app.get("/", (_req, res) => {
  res.json({ status: "Finance API running" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/ready", (_req, res) => {
  res.json({ ready: true });
});
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));


// Public auth (versioned)
app.use("/api/v1/auth", authRoutes);

// Protected (versioned)
app.use(mockAuth);
app.use(rateLimit);
app.use("/api/v1", apiRoutes);

// 404 handler
app.use((_req, _res, next) => {
  next(new AppError("Route not found", 404));
});

// Error handler
app.use((err, req, res, _next) => {
  const status = err.status || 500;

  const response = {
    error: err.message || "Server error",
    requestId: req.requestId
  };

  if (config.NODE_ENV !== "production") {
    response.stack = err.stack;
  }

  res.status(status).json(response);
});

module.exports = app;