// artifacts/api-server/src/app.ts
import express, { type Express } from "express";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { applySecurityMiddleware } from "./middlewares/security.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app: Express = express();

// 1. Security: Helmet, CORS, rate-limiting — must come first
applySecurityMiddleware(app);

// 2. Request logging — after security, before route handling
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

// 3. Body parsers — limit to 1 MB to prevent oversized payload DoS
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// 4. API routes
app.use("/api", router);

// 5. Unified error handler — must be last, after all routes
//    Catches both AppError subclasses and unexpected errors
app.use(errorHandler);

export default app;
