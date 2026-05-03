import express from "express";
import cors from "cors";
import netplayRouter from "../../api-server/src/routes/netplay.js";

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: "4mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", netplayRouter);

export default app;
