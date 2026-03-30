import mongoose from "mongoose";

const depositSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    paymentRef: {
      type: String,
      trim: true,
      default: null,
    },
    // Internal order ID (used by admin for manual approval)
    orderId: {
      type: String,
      trim: true,
      default: null,
    },
    // Payment gateway fields (populated when using the payment gateway)
    gatewayOrderNo: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    merchantOrderNo: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    payUrl: {
      type: String,
      default: null,
    },
    channelCode: {
      type: String,
      default: null,
    },
    fee: {
      type: Number,
      default: 0,
    },
    expireTime: {
      type: Number,
      default: null,
    },
    proof: {
      type: String,
      default: null,
    },
    // Whether payment was processed via gateway (true) or manually by admin (false)
    isGatewayPayment: {
      type: Boolean,
      default: false,
    },
    // Which gateway processed this deposit: "gateway1" | "oxpay"
    gateway: {
      type: String,
      enum: ["mcgindiamc", "oxoxmg", "usdt"],
      default: "mcgindiamc",
    },
  },
  {
    timestamps: true,
  }
);

depositSchema.index({ user: 1, createdAt: -1 });

const Deposit = mongoose.model("Deposit", depositSchema);

export default Deposit;
