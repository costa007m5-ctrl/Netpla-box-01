import { Router, type IRouter } from "express";
import healthRouter from "./health";
import hlsProxyRouter from "./hlsProxy";

const router: IRouter = Router();

router.use(healthRouter);
router.use(hlsProxyRouter);

export default router;
