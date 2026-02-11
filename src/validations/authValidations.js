import { z } from "zod";

export const registerSchema = z.object({
    phone: z.string().min(1, "Phone number is required"),
    password: z.string().min(1, "Password is required"),
    inviteCode: z.string().min(1, "Invalid invite code"),
});

export const loginSchema = z.object({
    phone: z.string().min(1, "Please provide phone number"),
    password: z.string().min(1, "Please provide password"),
});
