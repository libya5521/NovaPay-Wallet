// artifacts/api-server/src/routes/index.ts
import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import userRouter from "./user.js";
import walletRouter from "./wallet.js";
import transactionsRouter from "./transactions.js";
import kycRouter from "./kyc.js";
import transferRouter from "./transfer.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/user", userRouter);
router.use("/wallet", walletRouter);
router.use("/transactions", transactionsRouter);
router.use("/transfer", transferRouter);
router.use("/kyc", kycRouter);

export default router;
