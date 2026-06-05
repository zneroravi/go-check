import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";
import urlRoutes from "@/routes/urlRoutes";

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

app.use("/api/urls", urlRoutes);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use((_req, _res, next) => {
  next(new AppError("Not found", 404));
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || "Internal server error";

  logger.error(`${statusCode} - ${message}`);

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

const { config } = await import("@/config");
app.listen(config.port, () => {
  logger.info(`Server running on :${config.port}`);
});

export default app;
