import GiftCode from "../models/GiftCode.js";

// Generates a random alphanumeric gift code string.
function generateCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "GC-";
    for (let i = 0; i < 10; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// POST /gift-codes/generate — bulk generate gift codes (admin only)
export const generateGiftCodes = async (req, res, next) => {
    try {
        const { count = 1, maxUses, amount, remark = "" } = req.body;

        if (!maxUses || maxUses < 1) {
            return res.status(400).json({ success: false, message: "maxUses must be at least 1" });
        }
        if (amount === undefined || amount === null || amount < 0) {
            return res.status(400).json({ success: false, message: "amount is required and must be >= 0" });
        }

        const limit = Math.min(parseInt(count, 10) || 1, 100);
        const created = [];

        for (let i = 0; i < limit; i++) {
            let code;
            let attempts = 0;
            // Ensure uniqueness
            do {
                code = generateCode();
                attempts++;
            } while (attempts < 10 && (await GiftCode.exists({ code })));

            created.push(
                await GiftCode.create({
                    code,
                    amount: parseFloat(amount),
                    maxUses: parseInt(maxUses, 10),
                    remark,
                })
            );
        }

        res.status(201).json({
            success: true,
            message: `${created.length} gift code(s) generated`,
            data: created,
        });
    } catch (error) {
        next(error);
    }
};

// GET /gift-codes — list all gift codes (admin only)
export const listGiftCodes = async (req, res, next) => {
    try {
        const codes = await GiftCode.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: codes });
    } catch (error) {
        next(error);
    }
};

// DELETE /gift-codes/:id — delete a gift code (admin only)
export const deleteGiftCode = async (req, res, next) => {
    try {
        const code = await GiftCode.findByIdAndDelete(req.params.id);
        if (!code) {
            return res.status(404).json({ success: false, message: "Gift code not found" });
        }
        res.status(200).json({ success: true, message: "Gift code deleted" });
    } catch (error) {
        next(error);
    }
};
