import { Router, type IRouter } from "express";
import { z } from "zod";
import { rateLimiter } from "../middlewares/rateLimiter.js";
import { registerUser, loginUser } from "../services/authService.js";

const router: IRouter = Router();

// Apply strict rate limiting to auth endpoints
const authRateLimit = rateLimiter(10, 60_000); // 10 req/min per IP

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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
  } catch (err: any) {
    if (err.code === "DUPLICATE_EMAIL") {
      res.status(409).json({ error: "Conflict", message: "Email already registered" });
    } else {
      req.log.error({ err }, "Register error");
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
  } catch (err: any) {
    if (err.code === "INVALID_CREDENTIALS") {
      res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
    } else {
      req.log.error({ err }, "Login error");
      res.status(500).json({ error: "InternalError", message: "Login failed" });
    }
  }
});

export default router;
