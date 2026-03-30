import { Router, type IRouter } from "express";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth.js";
import { getUserProfile, updateUserProfile } from "../services/userService.js";

const router: IRouter = Router();

router.get("/profile", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getUserProfile(req.userId!);
    res.json(profile);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "USER_NOT_FOUND") {
      res.status(404).json({ error: "NotFound", message: "User not found" });
    } else {
      req.log.error({ err }, "Get profile error");
      res.status(500).json({ error: "InternalError", message: "Something went wrong" });
    }
  }
});

const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100).optional(),
  lastName: z.string().min(1, "Last name is required").max(100).optional(),
  phone: z.string().max(30).optional(),
});

router.patch("/profile", requireAuth, async (req: AuthenticatedRequest, res) => {
  const result = updateProfileSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: "ValidationError",
      message: result.error.issues.map((i) => i.message).join(", "),
    });
    return;
  }

  try {
    const profile = await updateUserProfile(req.userId!, result.data);
    res.json(profile);
  } catch (err: unknown) {
    req.log.error({ err }, "Update profile error");
    res.status(500).json({ error: "InternalError", message: "Something went wrong" });
  }
});

export default router;
