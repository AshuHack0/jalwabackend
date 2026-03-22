import { z } from "zod";

export const initiateDepositSchema = z.object({
  // z.coerce converts string "500" → 500 automatically; refine ensures it's a whole number
  amount: z
    .coerce
    .number({ invalid_type_error: "Amount must be a number" })
    .min(100, "Minimum deposit amount is ₹100")
    .max(500000, "Maximum deposit amount is ₹5,00,000")
    .refine((n) => Number.isInteger(n), { message: "Amount must be a whole number" }),
});
