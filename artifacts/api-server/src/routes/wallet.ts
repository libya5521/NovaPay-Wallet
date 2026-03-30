import { Router, type IRouter } from "express";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth.js";
import { getWalletBalance, sendMoney, addMoney, withdrawMoney } from "../services/walletService.js";
import { getVirtualCard, freezeCard, unfreezeCard } from "../services/cardService.js";

const router: IRouter = Router();

router.get("/balance", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const balance = await getWalletBalance(req.userId!);
    res.json(balance);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "WALLET_NOT_FOUND") {
      res.status(404).json({ error: "NotFound", message: "Wallet not found" });
    } else {
      req.log.error({ err }, "Get balance error");
      res.status(500).json({ error: "InternalError", message: "Something went wrong" });
    }
  }
});

router.get("/card", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const card = await getVirtualCard(req.userId!);
    res.json(card);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "CARD_NOT_FOUND") {
      res.status(404).json({ error: "NotFound", message: "Card not found" });
    } else {
      req.log.error({ err }, "Get card error");
      res.status(500).json({ error: "InternalError", message: "Something went wrong" });
    }
  }
});

router.post("/card/freeze", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const card = await freezeCard(req.userId!);
    res.json(card);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "CARD_NOT_FOUND") {
      res.status(404).json({ error: "NotFound", message: "Card not found" });
    } else {
      req.log.error({ err }, "Freeze card error");
      res.status(500).json({ error: "InternalError", message: "Something went wrong" });
    }
  }
});

router.post("/card/unfreeze", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const card = await unfreezeCard(req.userId!);
    res.json(card);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "CARD_NOT_FOUND") {
      res.status(404).json({ error: "NotFound", message: "Card not found" });
    } else {
      req.log.error({ err }, "Unfreeze card error");
      res.status(500).json({ error: "InternalError", message: "Something went wrong" });
    }
  }
});

const idempotencyKeySchema = z
  .string()
  .uuid("idempotencyKey must be a valid UUID")
  .optional();

const moneySchema = z.object({
  amount: z.number().positive("Amount must be positive").min(0.01).max(100000),
  note: z.string().max(200).optional(),
  idempotencyKey: idempotencyKeySchema,
});

router.post("/add", requireAuth, async (req: AuthenticatedRequest, res) => {
  const result = moneySchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: "ValidationError",
      message: result.error.issues.map((i) => i.message).join(", "),
    });
    return;
  }

  try {
    const data = await addMoney(
      req.userId!,
      result.data.amount,
      result.data.note,
      result.data.idempotencyKey
    );
    res.json(data);
  } catch (err: unknown) {
    req.log.error({ err }, "Add money error");
    res.status(500).json({ error: "InternalError", message: "Something went wrong" });
  }
});

router.post("/withdraw", requireAuth, async (req: AuthenticatedRequest, res) => {
  const result = moneySchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: "ValidationError",
      message: result.error.issues.map((i) => i.message).join(", "),
    });
    return;
  }

  try {
    const data = await withdrawMoney(
      req.userId!,
      result.data.amount,
      result.data.note,
      result.data.idempotencyKey
    );
    res.json(data);
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    const clientErrors = ["INSUFFICIENT_FUNDS", "INVALID_AMOUNT", "WALLET_NOT_FOUND"];
    if (e.code && clientErrors.includes(e.code)) {
      res.status(400).json({ error: e.code, message: e.message ?? "Request failed" });
    } else {
      req.log.error({ err }, "Withdraw error");
      res.status(500).json({ error: "InternalError", message: "Something went wrong" });
    }
  }
});

const sendMoneySchema = z.object({
  recipientEmail: z.string().email("Invalid recipient email"),
  amount: z.number().positive("Amount must be positive").min(0.01),
  note: z.string().max(200).optional(),
  idempotencyKey: idempotencyKeySchema,
});

router.post("/send", requireAuth, async (req: AuthenticatedRequest, res) => {
  const result = sendMoneySchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: "ValidationError",
      message: result.error.issues.map((i) => i.message).join(", "),
    });
    return;
  }

  try {
    const tx = await sendMoney(
      req.userId!,
      result.data.recipientEmail,
      result.data.amount,
      result.data.note,
      result.data.idempotencyKey
    );
    res.json(tx);
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    const clientErrors = ["INSUFFICIENT_FUNDS", "RECIPIENT_NOT_FOUND", "SELF_TRANSFER", "INVALID_AMOUNT"];
    if (e.code && clientErrors.includes(e.code)) {
      res.status(400).json({ error: e.code, message: e.message ?? "Request failed" });
    } else {
      req.log.error({ err }, "Send money error");
      res.status(500).json({ error: "InternalError", message: "Something went wrong" });
    }
  }
});

export default router;
