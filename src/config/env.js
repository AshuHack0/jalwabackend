import dotenv from "dotenv";
dotenv.config();

export const env = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/jalwa",
  JWT_SECRET: process.env.JWT_SECRET || "your_super_secret_jwt_key_jalwa_2024",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  INVITE_CODE: process.env.INVITE_CODE || "123456",
};

