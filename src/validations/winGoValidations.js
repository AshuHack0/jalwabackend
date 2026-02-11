import { z } from "zod";
import {
    VALID_BET_TYPES,
    BET_TYPE_BIG_SMALL,
    BET_TYPE_NUMBER,
    BET_TYPE_COLOR,
    BIG_SMALL_MAP,
    COLOR_MAP,
} from "../constants/winGoConstants.js";

const bigSmallValues = Object.values(BIG_SMALL_MAP).map((v) => v.toLowerCase());
const colorValues = Object.values(COLOR_MAP);

export const placeBetSchema = z
    .object({
        betType: z
            .string()
            .transform((v) => (v || "").toString().toUpperCase())
            .refine((v) => VALID_BET_TYPES.includes(v), {
                message: `betType must be one of '${VALID_BET_TYPES.join("', '")}'.`,
            }),
        choice: z.union([z.string(), z.number()]),
        amount: z.coerce.number().positive({ message: "Bet amount must be greater than 0." }),
        roundId: z.string().optional(),
    })
    .superRefine((data, ctx) => {
        if (data.betType === BET_TYPE_BIG_SMALL) {
            const normalized = data.choice?.toString().toLowerCase();
            if (!bigSmallValues.includes(normalized)) {
                ctx.addIssue({
                    code: "custom",
                    path: ["choice"],
                    message: `For BIG_SMALL bets, choice must be one of: ${Object.values(BIG_SMALL_MAP).join(", ")}.`,
                });
            }
        } else if (data.betType === BET_TYPE_NUMBER) {
            const num = Number(data.choice);
            if (!Number.isInteger(num) || num < 0 || num > 9) {
                ctx.addIssue({
                    code: "custom",
                    path: ["choice"],
                    message: "For NUMBER bets, choice must be an integer between 0 and 9.",
                });
            }
        } else if (data.betType === BET_TYPE_COLOR) {
            const normalized = data.choice?.toString().toUpperCase();
            if (!colorValues.includes(normalized)) {
                ctx.addIssue({
                    code: "custom",
                    path: ["choice"],
                    message: `For COLOR bets, choice must be one of: ${colorValues.join(", ")}.`,
                });
            }
        }
    });
