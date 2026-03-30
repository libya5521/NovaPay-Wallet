import { Router, type IRouter } from "express";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth.js";
import { getWalletBalance, sendMoney } from "../services/walletService.js";
import { getVirtualCard } from "../services/cardService.js";

const router: IRouter = Router();

router.get("/balance", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const balance = await getWalletBalance(req.userId!);
    res.json(balance);
  } catch (err: any) {
    if (err.code === "WALLET_NOT_FOUND") {
      res.status(404).json({ error: "NotFound", message: "Wallet not found" });
    } else {
      req.log.error({ err }, "Get balance error");
      res.status(500).json({ error: "InternalError", message: "Failed to fetch balance" });
    }
  }
});

router.get("/card", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const card = await getVirtualCard(req.userId!);
    res.json(card);
  } catch (err: any) {
    if (err.code === "CARD_NOT_FOUND") {
      res.status(404).json({ error: "NotFound", message: "Card not found" });
    } else {
      req.log.error({ err }, "Get card error");
      res.status(500).json({ error: "InternalError", message: "Failed to fetch card" });
    }
  }
});

const sendMoneySchema = z.object({
  recipientEmail: z.string().email(),
  amount: z.number().positive("Amount must be positive").min(0.01),
  note: z.string().max(200).optional(),
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
      result.data.note
    );
    res.json(tx);
  } catch (err: any) {
    const clientErrors = ["INSUFFICIENT_FUNDS", "RECIPIENT_NOT_FOUND", "SELF_TRANSFER", "INVALID_AMOUNT"];
    if (clientErrors.includes(err.code)) {
      res.status(400).json({ error: err.code, message: err.message });
    } else {
      req.log.error({ err }, "Send money error");
      res.status(500).json({ error: "InternalError", message: "Transfer failed" });
    }
  }
});

export default router;
