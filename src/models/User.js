import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
    {
        uid: {
            type: String,
            required: [true, "UID is required"],
            unique: true,
            trim: true,
        },
        phone: {
            type: String,
            required: [true, "Phone number is required"],
            unique: true,
            trim: true,
            match: [/^\+?[1-9]\d{1,14}$/, "Please fill a valid phone number"],
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [6, "Password must be at least 6 characters"],
            select: false,
        },
        nickname: {
            type: String,
            required: [false, "Nickname is required"],
            unique: true,
            trim: true,
        },
        avatar: {
            type: String,
            required: [false, "Avatar is required"],
            default: "https://www.jalwagame.win/assets/png/1-a6662edb.webp",
            trim: true,
        },
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
        },
        lastLogin: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model("User", userSchema);

export default User;
