// artifacts/api-server/src/middlewares/auth.ts
import type { NextFunction, Request, Response } from "express";
import { verifyJwt } from "../lib/jwt.js";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UnauthorizedError, KycError } from "../errors/index.js";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  // Attached by requireKyc
  userKycStatus?: string;
}

// ── requireAuth ──────────────────────────────────────────────────────────────
// Verifies the JWT access token and attaches userId + userEmail to the request.
// Throws UnauthorizedError on any failure (handled by errorHandler).

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: { code: "Unauthorized", message: "Missing Bearer token" } });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyJwt(token);
    req.userId = payload.sub;
    req.userEmail = (payload as { email?: string }).email;
    next();
  } catch {
    res.status(401).json({ error: { code: "Unauthorized", message: "Invalid token" } });
  }
}

// ── requireKyc ───────────────────────────────────────────────────────────────
// Must be used AFTER requireAuth.
// Checks that the authenticated user has kycStatus = "approved".
// Returns 403 KycRequired for any other status.

export function requireKyc(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: { code: "Unauthorized", message: "Authentication required" } });
    return;
  }

  db.select({ kycStatus: usersTable.kycStatus })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1)
    .then(([user]) => {
      if (!user) {
        res.status(401).json({ error: { code: "Unauthorized", message: "User not found" } });
        return;
      }
      if (user.kycStatus !== "approved") {
        res.status(403).json({
          error: {
            code: "KycRequired",
            message: "Identity verification (KYC) required before performing this action",
          },
        });
        return;
      }
      req.userKycStatus = user.kycStatus;
      next();
    })
    .catch((err) => {
      next(err);
    });
}
