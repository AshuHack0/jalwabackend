import mongoose from "mongoose";
import { env } from "./env.js";
import WinGoBet from "../models/WinGoBet.js";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI);
    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);

    // Sync indexes — drops removed unique constraint on wingobets (user+round)
    await WinGoBet.syncIndexes();
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;

