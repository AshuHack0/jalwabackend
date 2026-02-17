import mongoose from "mongoose";
import { env } from "./env.js";
import WinGoBet from "../models/WinGoBet.js";
import { clearCollections } from "../utils/clearDb.js";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI);
    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);

    if (env.CLEAR_DB_ON_START) {
      await clearCollections(env.CLEAR_DB_COLLECTIONS);
    }

    // Sync indexes — drops removed unique constraint on wingobets (user+round)
    await WinGoBet.syncIndexes();
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;

