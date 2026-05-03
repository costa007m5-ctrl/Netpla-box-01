import { Router, type IRouter } from "express";
import healthRouter from "./health";
import netplayRouter from "./netplay";

const router: IRouter = Router();

router.use(healthRouter);
router.use(netplayRouter);

export default router;
