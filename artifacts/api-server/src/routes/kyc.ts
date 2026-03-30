import { Router, type IRouter } from "express";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth.js";
import { getKycStatus, submitKyc } from "../services/userService.js";

const router: IRouter = Router();

router.get("/status", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const status = await getKycStatus(req.userId!);
    res.json(status);
  } catch (err: any) {
    req.log.error({ err }, "Get KYC status error");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch KYC status" });
  }
});

const kycSubmitSchema = z.object({
  fullName: z.string().min(1),
  dateOfBirth: z.string().min(1),
  nationality: z.string().min(1),
  documentType: z.enum(["passport", "national_id", "drivers_license"]),
  documentNumber: z.string().min(1),
  addressLine1: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
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
  } catch (err: any) {
    req.log.error({ err }, "Submit KYC error");
    res.status(500).json({ error: "InternalError", message: "Failed to submit KYC" });
  }
});

export default router;
