import mongoose from "mongoose";

const errorLogSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
    },
    stack: {
      type: String,
      default: null,
    },
    source: {
      type: String,
      default: "unknown",
      index: true,
    },
    context: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    path: { type: String, default: null },
    method: { type: String, default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    statusCode: { type: Number, default: null },
  },
  { timestamps: true }
);

errorLogSchema.index({ createdAt: -1 });
errorLogSchema.index({ source: 1, createdAt: -1 });

const ErrorLog = mongoose.model("ErrorLog", errorLogSchema);

export default ErrorLog;
