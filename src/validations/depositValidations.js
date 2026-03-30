import { z } from "zod";

export const initiateUsdtDepositSchema = z.object({
  amount: z
    .coerce
    .number({ invalid_type_error: "Amount must be a number" })
    .min(1, "Minimum USDT deposit is 1")
    .max(100000, "Maximum USDT deposit is 100,000"),
  network: z.enum(["TRC20", "ERC20", "BEP20"], {
    errorMap: () => ({ message: "Network must be TRC20, ERC20, or BEP20" }),
  }),
});

export const initiateDepositSchema = z.object({
  // z.coerce converts string "500" → 500 automatically; refine ensures it's a whole number
  amount: z
    .coerce
    .number({ invalid_type_error: "Amount must be a number" })
    .min(100, "Minimum deposit amount is ₹100")
    .max(500000, "Maximum deposit amount is ₹5,00,000")
    .refine((n) => Number.isInteger(n), { message: "Amount must be a whole number" }),
});
