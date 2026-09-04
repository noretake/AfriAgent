import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { apiRouter } from "./routes/index.js";
import type { Services } from "./services.js";

export function createApp(services: Services) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL.split(",").map((o) => o.trim()),
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "64kb" }));

  app.use("/api", apiRouter(services));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
