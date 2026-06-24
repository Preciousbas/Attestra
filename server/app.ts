import cors from "cors";
import express from "express";
import { healthRouter } from "./routes/health.ts";
import { proofRouter } from "./routes/proof.ts";
import { signalRouter } from "./routes/signal.ts";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.use(healthRouter);
  app.use(signalRouter);
  app.use(proofRouter);

  return app;
}
