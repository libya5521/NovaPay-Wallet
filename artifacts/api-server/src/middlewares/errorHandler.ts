// artifacts/api-server/src/middlewares/errorHandler.ts
import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger.js";
import { isAppError } from "../errors/index.js";

const isProd = process.env["NODE_ENV"] === "production";

/**
 * Global Express error handler.
 *
 * - AppError (isOperational=true)  → return structured JSON with the app-defined
 *   code and message.  Safe to surface to clients.
 * - AppError (isOperational=false) → log full error, return generic 500.
 * - Unknown errors                 → log full error, return generic 500.
 *
 * Stack traces are never included in production responses.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (isAppError(err) && err.isOperational) {
    // Operational errors — message is safe to return to the caller
    const body: Record<string, unknown> = {
      error: { code: err.code, message: err.message },
    };

    // Include field-level details for validation errors
    if ("errors" in err && err.errors) {
      body["errors"] = err.errors;
    }

    if (!isProd) {
      body["stack"] = err.stack;
    }

    res.status(err.statusCode).json(body);
    return;
  }

  // Non-operational or unknown error — log and send generic 500
  logger.error(
    { err, url: req.url, method: req.method },
    isAppError(err) ? "Non-operational AppError" : "Unhandled error"
  );

  res.status(500).json({
    error: {
      code: "InternalError",
      message: isProd ? "Something went wrong" : (err instanceof Error ? err.message : String(err)),
    },
    ...(!isProd && err instanceof Error ? { stack: err.stack } : {}),
  });
}
