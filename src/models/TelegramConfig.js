import mongoose from "mongoose";

// Singleton document — only one entry ever exists.
const telegramConfigSchema = new mongoose.Schema(
    {
        url: {
            type: String,
            required: [true, "Telegram URL is required"],
            trim: true,
        },
    },
    { timestamps: true }
);

const TelegramConfig = mongoose.model("TelegramConfig", telegramConfigSchema);

export default TelegramConfig;
