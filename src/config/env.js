import dotenv from "dotenv";
dotenv.config();

export const env = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/jalwa",
  JWT_SECRET: process.env.JWT_SECRET || "your_super_secret_jwt_key_jalwa_2024",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  INVITE_CODE: process.env.INVITE_CODE || "123456",
  /** Set to "true" to clear specified collections before starting (dev only) */
  CLEAR_DB_ON_START: process.env.CLEAR_DB_ON_START === "true",
  /** Comma-separated collection names, e.g. "WinGoRound,WinGoBet" or "WinGoRound" */
  CLEAR_DB_COLLECTIONS: process.env.CLEAR_DB_COLLECTIONS || "WinGoRound,WinGoBet",

  // Payment gateway configuration
  PAYMENT_GATEWAY_URL: process.env.PAYMENT_GATEWAY_URL || "http://localhost:5005",
  PAYMENT_ACCESS_KEY: process.env.PAYMENT_ACCESS_KEY || "",
  PAYMENT_ACCESS_SECRET: process.env.PAYMENT_ACCESS_SECRET || "",
  PAYMENT_CHANNEL_CODE: process.env.PAYMENT_CHANNEL_CODE || "71001",
  // Backend production URL — must be publicly reachable by the payment gateway
  BACKEND_URL: process.env.BACKEND_URL || "https://api.indgames.online",
  // Deep link scheme for the mobile app — used as JumpUrl after payment
  APP_FRONTEND_URL: process.env.APP_FRONTEND_URL || "jalwaapp://",
};

