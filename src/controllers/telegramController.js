import TelegramConfig from "../models/TelegramConfig.js";

// GET /telegram — returns the current telegram URL (null if not set)
export const getTelegram = async (req, res, next) => {
    try {
        const config = await TelegramConfig.findOne();
        res.status(200).json({
            success: true,
            data: { url: config ? config.url : null },
        });
    } catch (error) {
        next(error);
    }
};

// PUT /telegram — upsert: creates if not exists, updates if exists (admin only)
export const upsertTelegram = async (req, res, next) => {
    try {
        const { url } = req.body;

        if (!url || !url.trim()) {
            return res.status(400).json({
                success: false,
                message: "Telegram URL is required",
            });
        }

        const config = await TelegramConfig.findOne();

        if (config) {
            config.url = url.trim();
            await config.save();
        } else {
            await TelegramConfig.create({ url: url.trim() });
        }

        res.status(200).json({
            success: true,
            message: "Telegram URL saved successfully",
            data: { url: url.trim() },
        });
    } catch (error) {
        next(error);
    }
};

// DELETE /telegram — removes the telegram URL (admin only)
export const deleteTelegram = async (req, res, next) => {
    try {
        await TelegramConfig.deleteOne();
        res.status(200).json({
            success: true,
            message: "Telegram URL removed successfully",
            data: { url: null },
        });
    } catch (error) {
        next(error);
    }
};
