import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import netplayRouter from "./netplay.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(netplayRouter);

export default router;
