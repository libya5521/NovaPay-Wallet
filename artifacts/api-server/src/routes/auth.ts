import { Router, type IRouter } from "express";
import { z } from "zod";
import { rateLimiter } from "../middlewares/rateLimiter.js";
import { registerUser, loginUser } from "../services/authService.js";

const router: IRouter = Router();

const authRateLimit = rateLimiter(10, 60_000);

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  phone: z.string().max(30).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

router.post("/register", authRateLimit, async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: "ValidationError",
      message: result.error.issues.map((i) => i.message).join(", "),
    });
    return;
  }

  try {
    const data = await registerUser(result.data);
    res.status(201).json(data);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "DUPLICATE_EMAIL") {
      res.status(409).json({ error: "Conflict", message: "Email already registered" });
    } else {
      (req as any).log.error({ err }, "Register error");
      res.status(500).json({ error: "InternalError", message: "Registration failed" });
    }
  }
});

router.post("/login", authRateLimit, async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: "ValidationError",
      message: result.error.issues.map((i) => i.message).join(", "),
    });
    return;
  }

  try {
    const data = await loginUser(result.data.email, result.data.password);
    res.json(data);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "INVALID_CREDENTIALS") {
      res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
    } else {
      (req as any).log.error({ err }, "Login error");
      res.status(500).json({ error: "InternalError", message: "Login failed" });
    }
  }
});

router.post("/forgot-password", authRateLimit, async (req, res) => {
  const result = forgotPasswordSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "ValidationError", message: "Valid email is required" });
    return;
  }
  res.json({ message: "If this email exists, a reset link will be sent." });
});

export default router;
