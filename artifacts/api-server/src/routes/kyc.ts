import { Router, type IRouter } from "express";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth.js";
import { getKycStatus, submitKyc } from "../services/userService.js";

const router: IRouter = Router();

router.get("/status", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const status = await getKycStatus(req.userId!);
    res.json(status);
  } catch (err: unknown) {
    req.log.error({ err }, "Get KYC status error");
    res.status(500).json({ error: "InternalError", message: "Something went wrong" });
  }
});

const kycSubmitSchema = z.object({
  fullName: z.string().min(2, "Full name is required").max(200),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  nationality: z.string().min(2).max(100),
  documentType: z.enum(["passport", "national_id", "drivers_license"]),
  documentNumber: z.string().min(3).max(50),
  addressLine1: z.string().min(5).max(200),
  city: z.string().min(2).max(100),
  country: z.string().min(2).max(100),
});

router.post("/submit", requireAuth, async (req: AuthenticatedRequest, res) => {
  const result = kycSubmitSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: "ValidationError",
      message: result.error.issues.map((i) => i.message).join(", "),
    });
    return;
  }

  try {
    const status = await submitKyc(req.userId!, result.data);
    res.json(status);
  } catch (err: unknown) {
    req.log.error({ err }, "Submit KYC error");
    res.status(500).json({ error: "InternalError", message: "Something went wrong" });
  }
});

export default router;
