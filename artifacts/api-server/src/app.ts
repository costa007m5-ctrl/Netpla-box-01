import express, { type Express } from "express";
import cors from "cors";
import * as pinoHttpModule from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// pino-http exports differ between CJS/ESM; handle both
const pinoHttpFn: (...args: unknown[]) => unknown =
  typeof (pinoHttpModule as any).default === 'function'
    ? (pinoHttpModule as any).default
    : (pinoHttpModule as any);

app.use(
  pinoHttpFn({
    logger,
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }) as any,
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
