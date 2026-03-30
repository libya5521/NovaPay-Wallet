// artifacts/api-server/src/config/env.ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z
    .string()
    .min(1)
    .transform((v) => {
      const n = Number(v);
      if (isNaN(n) || n <= 0 || n > 65535) throw new Error(`Invalid PORT: ${v}`);
      return n;
    }),

  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid connection URL"),

  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters for HS256 security"),

  ALLOWED_ORIGIN: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : []
    ),

  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters")
    .optional(),

  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),

  BCRYPT_ROUNDS: z
    .string()
    .optional()
    .transform((v) => {
      const n = Number(v ?? "12");
      if (isNaN(n) || n < 10 || n > 20)
        throw new Error("BCRYPT_ROUNDS must be between 10 and 20");
      return n;
    }),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${issues}`);
  }

  const data = result.data;

  if (data.NODE_ENV === "production") {
    if (!data.ALLOWED_ORIGIN || data.ALLOWED_ORIGIN.length === 0) {
      throw new Error(
        "ALLOWED_ORIGIN is required in production and must list at least one origin"
      );
    }
    if (!data.SESSION_SECRET) {
      throw new Error("SESSION_SECRET is required in production");
    }
  }

  return data;
}

export const env = parseEnv();
export type Env = typeof env;
