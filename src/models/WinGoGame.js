import mongoose from "mongoose";

const winGoGameSchema = new mongoose.Schema(
    {
        name: {
            type: String, // "WinGo 30 sec", "WinGo 1 min", "WinGo 3 min", "WinGo 5 min"
            required: true,
            trim: true,
        },
        durationSeconds: {
            type: Number, // 30, 60, 180, 300 => 30s, 1min, 3min, 5min
            required: true, 
            min: 1,
        },
        gameCode: {
            type: String, // "10005", "10001", "10003", "10004" — used in period generation
            required: true,
            unique: true,
            trim: true,
        }
    },
    {
        timestamps: true,
    }
);

const WinGoGame = mongoose.model("WinGoGame", winGoGameSchema);

export default WinGoGame;

