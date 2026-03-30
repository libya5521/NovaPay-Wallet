// artifacts/api-server/src/middlewares/validate.ts
//
// Generic Zod request-validation middleware for NovaPay API.
// Validates body, query, and params against a Zod schema.
// All string values are trimmed and stripped of HTML tags before validation
// to prevent stored-XSS and to normalise input.
//
import type { NextFunction, Request, Response } from "express";
import { z, type ZodTypeAny, ZodError } from "zod";

// ---------------------------------------------------------------------------
// String sanitiser — trim whitespace + remove HTML tags
// Applied to every string field before schema validation
// ---------------------------------------------------------------------------
function stripHtml(value: string): string {
  // Remove tags, then collapse whitespace produced by tag removal
  return value.replace(/<[^>]*>/g, "").trim();
}

function sanitizeStrings(value: unknown): unknown {
  if (typeof value === "string") return stripHtml(value);
  if (Array.isArray(value)) return value.map(sanitizeStrings);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        sanitizeStrings(v),
      ])
    );
  }
  return value;
}

// ---------------------------------------------------------------------------
// Validation targets
// ---------------------------------------------------------------------------
export type ValidationTarget = "body" | "query" | "params";

// ---------------------------------------------------------------------------
// validate(schema, target?)
//
// Returns Express middleware that:
//   1. Sanitizes string fields (trim + strip HTML)
//   2. Validates against the provided Zod schema
//   3. Replaces req[target] with the parsed (coerced) output so downstream
//      handlers receive type-safe values
//   4. On failure returns 400 with a structured errors array
// ---------------------------------------------------------------------------
export function validate<T extends ZodTypeAny>(
  schema: T,
  target: ValidationTarget = "body"
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const raw = sanitizeStrings(req[target]);
    const result = schema.safeParse(raw);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      res.status(400).json({
        error: "ValidationError",
        message: "Request validation failed",
        errors,
      });
      return;
    }

    // Overwrite with the sanitised, coerced output
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any)[target] = result.data;
    next();
  };
}

// ---------------------------------------------------------------------------
// formatZodErrors — convert Zod issues to a flat, API-friendly array
// ---------------------------------------------------------------------------
interface FieldError {
  field: string;
  message: string;
}

function formatZodErrors(error: ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "_root",
    message: issue.message,
  }));
}

// ---------------------------------------------------------------------------
// Convenience: validateBody / validateQuery / validateParams
// ---------------------------------------------------------------------------
export function validateBody<T extends ZodTypeAny>(schema: T) {
  return validate(schema, "body");
}

export function validateQuery<T extends ZodTypeAny>(schema: T) {
  return validate(schema, "query");
}

export function validateParams<T extends ZodTypeAny>(schema: T) {
  return validate(schema, "params");
}

// ---------------------------------------------------------------------------
// Pre-built reusable field schemas — import these in route files for
// consistency across the API.
// ---------------------------------------------------------------------------
export const commonSchemas = {
  /** Standard UUIDs — rejects injection attempts in URL params */
  uuid: z.string().uuid("Must be a valid UUID"),

  /** Email — normalised to lowercase */
  email: z
    .string()
    .email("Must be a valid email address")
    .transform((v) => v.toLowerCase().trim()),

  /** Numeric monetary amount — must be positive, max 2 decimal places */
  amount: z
    .number({ invalid_type_error: "Amount must be a number" })
    .positive("Amount must be positive")
    .multipleOf(0.01, "Amount must have at most 2 decimal places"),

  /** ISO 4217 currency code */
  currency: z
    .string()
    .length(3, "Currency must be a 3-letter ISO 4217 code")
    .transform((v) => v.toUpperCase()),

  /** Pagination page — defaults to 1 */
  page: z.coerce
    .number()
    .int()
    .positive()
    .default(1),

  /** Pagination limit — defaults to 20, max 100 */
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100, "Limit cannot exceed 100")
    .default(20),

  /** Password — min 8 chars, at least one letter and one digit */
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/\d/, "Password must contain at least one digit"),

  /** Numeric PIN */
  pin: z
    .string()
    .regex(/^\d{4,8}$/, "PIN must be 4–8 digits"),
};
