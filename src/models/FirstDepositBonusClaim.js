import mongoose from "mongoose";

const firstDepositBonusClaimSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    offerId: {
      type: Number,
      required: true,
      index: true,
    },
    rewardAmount: {
      type: Number,
      required: true,
    },
    rechargeAmount: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

firstDepositBonusClaimSchema.index({ user: 1, offerId: 1 }, { unique: true });

const FirstDepositBonusClaim = mongoose.model(
  "FirstDepositBonusClaim",
  firstDepositBonusClaimSchema
);

export default FirstDepositBonusClaim;
