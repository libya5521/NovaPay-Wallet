// artifacts/api-server/src/routes/transfer.ts
//
// POST /api/transfer — idempotent peer-to-peer transfer
//
import { Router, type IRouter } from "express";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth.js";
import { transfer } from "../services/transfer.service.js";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const transferSchema = z.object({
  recipientEmail: z.string().email("Invalid recipient email"),
  amount: z.number().positive("Amount must be positive").max(100_000, "Amount exceeds limit"),
  currency: z.string().length(3).default("USD"),
  note: z.string().max(200).optional(),
  idempotencyKey: z.string().min(1).max(128),
});

router.post("/", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  const parsed = transferSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: "ValidationError",
        message: parsed.error.issues.map((i) => i.message).join(", "),
      },
    });
    return;
  }

  const { recipientEmail, amount, currency, note, idempotencyKey } = parsed.data;
  const fromUserId = req.userId!;

  try {
    // Resolve recipient
    const [recipient] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, recipientEmail.toLowerCase()))
      .limit(1);

    if (!recipient) {
      res.status(404).json({ error: { code: "NotFound", message: "Recipient not found" } });
      return;
    }

    if (recipient.id === fromUserId) {
      res.status(422).json({ error: { code: "SELF_TRANSFER", message: "Cannot send money to yourself" } });
      return;
    }

    const result = await transfer({
      fromUserId,
      toUserId: recipient.id,
      amount,
      currency,
      note,
      idempotencyKey,
    });

    res.status(result.idempotent ? 200 : 201).json({
      idempotent: result.idempotent,
      debit: {
        id: result.debit.id,
        type: result.debit.type,
        amount: result.debit.amount,
        currency: result.debit.currency,
        description: result.debit.description,
        status: result.debit.status,
        createdAt: result.debit.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
