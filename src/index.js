import express from "express";
import cors from "cors";
import routes from "./routes/index.js";
import morgan from "morgan";
import { env } from "./config/env.js";
import connectDB from "./config/database.js";
import { startWinGoScheduler } from "./services/winGoScheduler.js";
import { logErrorToDbAsync } from "./utils/logErrorToDb.js";

const app = express();

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));

// Root route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to Jalwa Backend API",
    version: "1.0.0",
  });
});

// V1 Routes
app.use("/api/v1", routes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  logErrorToDbAsync(err, { source: "express", context: { statusCode: 500 }, req });
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

connectDB().then(() => {
  app.listen(env.PORT, () => {
    console.log(`🚀 Server is running at http://localhost:${env.PORT}`);
    startWinGoScheduler();
  });
});

export default app;
