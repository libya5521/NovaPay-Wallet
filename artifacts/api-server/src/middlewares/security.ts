// artifacts/api-server/src/middlewares/security.ts
//
// Consolidated security middleware for NovaPay API.
// Import applySecurityMiddleware(app) in app.ts instead of wiring each piece
// individually.
//
import type { Application, NextFunction, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import { logger } from "../lib/logger.js";

// ---------------------------------------------------------------------------
// Environment — read directly so this file stays importable before env.ts runs
// ---------------------------------------------------------------------------
const isProd = process.env["NODE_ENV"] === "production";

const rawOrigins = (process.env["ALLOWED_ORIGIN"] ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// ---------------------------------------------------------------------------
// Helmet — strict headers for an API (no CSP because we serve JSON only;
// CSP is the responsibility of any browser-facing front-end, not the API)
// ---------------------------------------------------------------------------
const helmetConfig = helmet({
  // API servers don't serve HTML — disable CSP to avoid false-positive blocks
  contentSecurityPolicy: false,
  // Disable COEP — not relevant for a pure JSON API
  crossOriginEmbedderPolicy: false,
  // Keep the rest: HSTS, X-Frame-Options, X-Content-Type-Options, etc.
  hsts: isProd
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  referrerPolicy: { policy: "no-referrer" },
  xContentTypeOptions: true,
});

// ---------------------------------------------------------------------------
// CORS — strict allowlist in production; permissive in development
// ---------------------------------------------------------------------------
function originAllowed(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
): void {
  // Allow non-browser callers (server-to-server, curl, mobile apps)
  if (!origin) {
    callback(null, true);
    return;
  }
  if (!isProd) {
    callback(null, true);
    return;
  }
  if (rawOrigins.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error(`Origin ${origin} is not in the CORS allowlist`));
  }
}

const corsConfig = cors({
  origin: originAllowed,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  exposedHeaders: ["X-Request-ID"],
  credentials: true,
  maxAge: 600, // Preflight cache 10 minutes
});

// ---------------------------------------------------------------------------
// In-memory rate limiter
// ---------------------------------------------------------------------------
interface LimitEntry {
  count: number;
  resetAt: number;
}

class InMemoryRateLimiter {
  private store = new Map<string, LimitEntry>();

  constructor(private readonly maxRequests: number, private readonly windowMs: number) {
    // Prune every window to bound memory
    setInterval(() => {
      const now = Date.now();
      for (const [key, val] of this.store) {
        if (val.resetAt < now) this.store.delete(key);
      }
    }, windowMs).unref();
  }

  check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.resetAt < now) {
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remaining: this.maxRequests - 1, resetAt: now + this.windowMs };
    }

    if (entry.count >= this.maxRequests) {
      return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }
}

// Global limiter: 100 requests / 15 minutes per IP
const globalLimiter = new InMemoryRateLimiter(100, 15 * 60 * 1000);

// Auth-route limiter: 20 requests / 1 minute per IP (brute-force protection)
const authLimiter = new InMemoryRateLimiter(20, 60 * 1000);

function makeRateLimitMiddleware(limiter: InMemoryRateLimiter) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const { allowed, remaining, resetAt } = limiter.check(ip);

    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));

    if (!allowed) {
      res.status(429).json({
        error: "TooManyRequests",
        message: "Rate limit exceeded. Please wait before retrying.",
        retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
      });
      return;
    }

    next();
  };
}

export const globalRateLimit = makeRateLimitMiddleware(globalLimiter);
export const authRateLimit = makeRateLimitMiddleware(authLimiter);

// ---------------------------------------------------------------------------
// Global error handler — never expose stack traces or internal messages
// in production; always returns a structured JSON envelope
// ---------------------------------------------------------------------------
export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  logger.error({ err, url: req.url, method: req.method }, "Unhandled error");

  const statusCode =
    (err as { statusCode?: number }).statusCode ??
    (err as { status?: number }).status ??
    500;

  // In production strip any internal message; in development expose it for
  // easier debugging
  const message = isProd
    ? statusCode < 500
      ? err.message // Operational errors (4xx) are safe to surface
      : "Something went wrong"
    : err.message;

  res.status(statusCode).json({
    error: err.name ?? "InternalError",
    message,
    ...(isProd ? {} : { stack: err.stack }),
  });
}

// ---------------------------------------------------------------------------
// applySecurityMiddleware — single call that wires all of the above
// ---------------------------------------------------------------------------
export function applySecurityMiddleware(app: Application): void {
  app.set("trust proxy", 1); // Required for correct req.ip behind a reverse proxy

  // Security headers
  app.use(helmetConfig);

  // CORS (must come before route handlers)
  app.use(corsConfig);

  // Global rate limit on all routes
  app.use(globalRateLimit);

  // Stricter limit on /api/auth/* routes — mounted in routes/index or per-router
  app.use("/api/auth", authRateLimit);
}
