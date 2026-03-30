// artifacts/api-server/src/app.ts
import express, { type Express } from "express";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { applySecurityMiddleware, globalErrorHandler } from "./middlewares/security.js";

const app: Express = express();

// Security: Helmet, CORS, rate-limiting — must come first
applySecurityMiddleware(app);

// Request logging — after security, before route handling
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          // Strip query string from logs to avoid leaking sensitive params
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  })
);

// Body parsers — limit to 1 MB to prevent oversized payload DoS
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// API routes
app.use("/api", router);

// Global error handler — must be last, after all routes
app.use(globalErrorHandler);

export default app;
