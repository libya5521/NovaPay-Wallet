// artifacts/api-server/src/errors/index.ts
//
// Typed error hierarchy for NovaPay API.
//
// isOperational = true  → safe to surface the message to the client (4xx errors)
// isOperational = false → internal fault; log the real error, send generic 500

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code = "InternalError", isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── 400 ────────────────────────────────────────────────────────────────────
export class ValidationError extends AppError {
  readonly errors?: { field: string; message: string }[];
  constructor(message: string, errors?: { field: string; message: string }[]) {
    super(message, 400, "ValidationError");
    this.errors = errors;
  }
}

// ── 401 ────────────────────────────────────────────────────────────────────
export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "Unauthorized");
  }
}

// ── 403 ────────────────────────────────────────────────────────────────────
export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, 403, "Forbidden");
  }
}

export class KycError extends AppError {
  constructor(message = "KYC verification required before performing this action") {
    super(message, 403, "KycRequired");
  }
}

// ── 404 ────────────────────────────────────────────────────────────────────
export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NotFound");
  }
}

// ── 409 ────────────────────────────────────────────────────────────────────
export class ConflictError extends AppError {
  constructor(message: string, code = "Conflict") {
    super(message, 409, code);
  }
}

// ── 422 ────────────────────────────────────────────────────────────────────
export class TransferError extends AppError {
  constructor(message: string, code: string) {
    super(message, 422, code);
  }
}

// ── Type guard ─────────────────────────────────────────────────────────────
export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
