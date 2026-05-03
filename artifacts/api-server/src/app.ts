import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import router from "./routes/index.js";

const app: Express = express();

app.use(cors({ origin: "*", methods: ["GET","POST","PUT","DELETE","OPTIONS"], allowedHeaders: ["Content-Type","Authorization"] }));

app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.body !== undefined) {
    if (typeof req.body === "string") {
      try { req.body = JSON.parse(req.body); } catch (_e) {}
    }
    return next();
  }
  express.json()(req, res, next);
});

app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
