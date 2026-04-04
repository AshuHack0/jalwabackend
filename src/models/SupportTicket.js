import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    fieldName: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true }, // e.g. /uploads/support/1234-abc.jpg
  },
  { _id: false }
);

const supportTicketSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        "deposit-report",
        "withdrawal-statement",
        "change-password",
        "delete-withdraw-bank",
        "delete-upi-rebind",
        "delete-usdt-rebind",
        "modify-ifsc",
        "change-bank-name",
      ],
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "resolved", "rejected"],
      default: "pending",
    },
    fields: { type: mongoose.Schema.Types.Mixed, default: {} },
    files: { type: [fileSchema], default: [] },
    remark: { type: String, default: "" },
  },
  { timestamps: true }
);

supportTicketSchema.index({ user: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, createdAt: -1 });

const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);

export default SupportTicket;
