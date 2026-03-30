import { Router, type IRouter } from "express";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth.js";
import { getTransactions } from "../services/transactionService.js";

const router: IRouter = Router();

const transactionsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => Math.max(1, parseInt(v ?? "1", 10)))
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .transform((v) => Math.min(100, Math.max(1, parseInt(v ?? "20", 10))))
    .pipe(z.number().int().positive()),
});

router.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = transactionsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: parsed.error.issues[0]?.message ?? "Invalid query params" });
    return;
  }

  const { page, limit } = parsed.data;

  try {
    const data = await getTransactions(req.userId!, page, limit);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Get transactions error");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch transactions" });
  }
});

export default router;
