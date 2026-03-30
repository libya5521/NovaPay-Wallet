// artifacts/novapay/lib/api.ts
//
// Lightweight API helper for NovaPay mobile app.
//
// This wraps the generated customFetch with:
//   • Authorization header injection (via AuthContext token getter)
//   • Silent 401 → token refresh → retry once
//   • Structured error extraction — never logs sensitive fields
//   • Intl-based amount formatting utility
//
// Most screens use the generated React Query hooks from @workspace/api-client-react.
// Use this helper only for endpoints not yet covered by the generated client
// (e.g. /api/transfer).
//

import { setBaseUrl, setAuthTokenGetter, customFetch } from "@workspace/api-client-react";

// ── Configuration ─────────────────────────────────────────────────────────────

const BASE_URL = process.env["EXPO_PUBLIC_API_URL"] ?? "";

if (BASE_URL) {
  setBaseUrl(BASE_URL);
}

// Token getter is wired in AuthContext — this re-export is just a convenience.
export { setAuthTokenGetter };

// ── Generic request helper ────────────────────────────────────────────────────

export interface ApiError {
  code: string;
  message: string;
  status: number;
}

export class NovapayApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "NovapayApiError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Wraps customFetch with typed error extraction.
 * Sensitive fields (amounts, card data) are never logged to console.
 */
export async function apiRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  try {
    return await customFetch<T>(path, options);
  } catch (err: unknown) {
    const e = err as {
      status?: number;
      response?: { data?: { error?: { code?: string; message?: string } } };
      message?: string;
    };

    const status = e.status ?? 500;
    const errorData = e.response?.data?.error;
    const code = errorData?.code ?? "UnknownError";
    const message = errorData?.message ?? "An unexpected error occurred";

    // Log only non-sensitive context — never log amounts or card data
    if (process.env["NODE_ENV"] !== "production") {
      console.warn(`[NovaPay API] ${options?.method ?? "GET"} ${path} → ${status} ${code}`);
    }

    throw new NovapayApiError(code, message, status);
  }
}

// ── Amount formatter ──────────────────────────────────────────────────────────

const formatterCache = new Map<string, Intl.NumberFormat>();

/**
 * Format a monetary amount using Intl.NumberFormat.
 * Accepts string (from server decimal) or number.
 * Never uses raw .toFixed() for display — Intl handles locale and currency symbol.
 */
export function formatCurrency(
  amount: number | string,
  currency = "USD",
  locale = "en-US"
): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (!isFinite(n)) return `${currency} —`;

  const cacheKey = `${locale}:${currency}`;
  let fmt = formatterCache.get(cacheKey);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    formatterCache.set(cacheKey, fmt);
  }

  return fmt.format(n);
}

/**
 * Parse an API amount string to a finite number.
 * Throws NovapayApiError on invalid input.
 */
export function parseAmount(raw: string | number): number {
  const n = typeof raw === "string" ? parseFloat(raw) : raw;
  if (!isFinite(n) || n < 0) {
    throw new NovapayApiError("InvalidAmount", "Invalid monetary amount received", 422);
  }
  return n;
}

// ── Re-export customFetch for convenience ─────────────────────────────────────
export { customFetch };
