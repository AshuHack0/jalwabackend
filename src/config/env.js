import dotenv from "dotenv";
dotenv.config();

export const env = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/jalwa",
  JWT_SECRET: process.env.JWT_SECRET || "your_super_secret_jwt_key_jalwa_2024",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "30d",
  INVITE_CODE: process.env.INVITE_CODE || "22644115085",

  // Backend production URL — must be publicly reachable by the payment gateway
  BACKEND_URL: process.env.BACKEND_URL || "https://api.indgames.online",
  // Deep link scheme for the mobile app — used as JumpUrl after payment
  APP_FRONTEND_URL: process.env.APP_FRONTEND_URL || "jalwaapp://",

  // Mcgindiamc gateway configuration
  MCGINDIAMC_GATEWAY_URL: process.env.MCGINDIAMC_GATEWAY_URL || "https://mcapi.mcgindiamc.com",
  MCGINDIAMC_ACCESS_KEY: process.env.MCGINDIAMC_ACCESS_KEY || "",
  MCGINDIAMC_ACCESS_SECRET: process.env.MCGINDIAMC_ACCESS_SECRET || "",
  MCGINDIAMC_CHANNEL_CODE: process.env.MCGINDIAMC_CHANNEL_CODE || "71001",

  // Oxoxmg gateway configuration
  OXOXMG_GATEWAY_URL: process.env.OXOXMG_GATEWAY_URL || "https://mcapi.oxoxmg.com",
  OXOXMG_MERCHANT_ID: process.env.OXOXMG_MERCHANT_ID || "",
  OXOXMG_MD5_KEY: process.env.OXOXMG_MD5_KEY || "",
  OXOXMG_PASSAGE_CODE: process.env.OXOXMG_PASSAGE_CODE || "100001",

  // USDT gateway configuration
  USDT_GATEWAY_URL: process.env.USDT_GATEWAY_URL || "https://mcapi.aymercher.com",
  USDT_ACCESS_KEY: process.env.USDT_ACCESS_KEY || "",
  USDT_ACCESS_SECRET: process.env.USDT_ACCESS_SECRET || "",
  // ChannelCode for USDT-TRC20 — ask your gateway provider for the correct value
  USDT_CHANNEL_CODE: process.env.USDT_CHANNEL_CODE || "91001",

};

