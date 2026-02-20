import User from "../models/User.js";
import Deposit from "../models/Deposit.js";
import FirstDepositBonusClaim from "../models/FirstDepositBonusClaim.js";
import { FIRST_DEPOSIT_BONUS_OFFERS } from "../constants/firstDepositBonus.js";

const formatTimestamp = (date) =>
  date.toISOString().replace("T", " ").slice(0, 19);

/**
 * First deposit bonus offers - returns tiered deposit rewards.
 * Uses optional auth: if user is logged in, returns real progress and claim status.
 * Otherwise returns offers with default (0 progress, canReceive/isFinshed false).
 */
export const getFirstDepositBonus = async (req, res) => {
  try {
    const userId = req.user?._id;
    let totalDeposited = 0;
    const claimedOfferIds = new Set();

    if (userId) {
      const user = await User.findById(userId).select("totalDeposited");
      if (user) totalDeposited = user.totalDeposited ?? 0;

      const claims = await FirstDepositBonusClaim.find({ user: userId }).select(
        "offerId"
      );
      claims.forEach((c) => claimedOfferIds.add(c.offerId));
    }

    const data = FIRST_DEPOSIT_BONUS_OFFERS.map((offer) => {
      const isFinished = claimedOfferIds.has(offer.id);
      const progress = Math.min(totalDeposited, offer.rechargeAmount);
      const canReceive =
        !isFinished && totalDeposited >= offer.rechargeAmount;

      return {
        id: offer.id,
        rewardAmount: offer.rewardAmount,
        rechargeAmount: offer.rechargeAmount,
        order: offer.order,
        state: 1,
        createTime: "2025-03-20 18:42:02",
        lastUpdateTime: "2025-03-29 13:06:23",
        canReceive,
        isFinshed: isFinished,
        currentProgress: progress,
      };
    });

    return res.status(200).json({
      data,
      code: 0,
      msg: "Succeed",
      msgCode: 0,
      serviceNowTime: formatTimestamp(new Date()),
    });
  } catch (err) {
    console.error("getFirstDepositBonus error:", err);
    return res.status(500).json({
      data: [],
      code: -1,
      msg: err.message || "Internal server error",
      msgCode: -1,
      serviceNowTime: formatTimestamp(new Date()),
    });
  }
};

/**
 * User self-deposit. Logged-in user deposits amount.
 * Creates Deposit entry, adds to totalDeposited and walletBalance.
 */
export const depositAsUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Positive amount is required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const deposit = await Deposit.create({
      user: userId,
      amount,
      status: "completed",
      paymentRef: null,
    });

    user.totalDeposited = (user.totalDeposited || 0) + amount;
    user.walletBalance = (user.walletBalance || 0) + amount;
    await user.save();

    return res.status(201).json({
      success: true,
      data: {
        depositId: deposit._id,
        amount,
        totalDeposited: user.totalDeposited,
        walletBalance: user.walletBalance,
      },
    });
  } catch (err) {
    console.error("depositAsUser error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }
};

/**
 * Record a completed deposit. Updates User.totalDeposited and User.walletBalance.
 * Use protect + authorize("admin") or call from payment webhook with internal auth.
 */
export const recordDeposit = async (req, res) => {
  try {
    const { userId, amount, paymentRef } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "userId and positive amount are required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const deposit = await Deposit.create({
      user: userId,
      amount,
      status: "completed",
      paymentRef: paymentRef || null,
    });

    user.totalDeposited = (user.totalDeposited || 0) + amount;
    user.walletBalance = (user.walletBalance || 0) + amount;
    await user.save();

    return res.status(201).json({
      success: true,
      data: {
        depositId: deposit._id,
        amount,
        totalDeposited: user.totalDeposited,
        walletBalance: user.walletBalance,
      },
    });
  } catch (err) {
    console.error("recordDeposit error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }
};

/**
 * Claim a first deposit bonus tier. User must have totalDeposited >= rechargeAmount
 * and must not have already claimed this tier.
 */
export const claimFirstDepositBonus = async (req, res) => {
  try {
    const userId = req.user._id;
    const { offerId } = req.body;

    const offer = FIRST_DEPOSIT_BONUS_OFFERS.find((o) => o.id === offerId);
    if (!offer) {
      return res.status(400).json({
        code: -1,
        msg: "Invalid offer",
        serviceNowTime: formatTimestamp(new Date()),
      });
    }

    const user = await User.findById(userId).select("totalDeposited walletBalance");
    const totalDeposited = user?.totalDeposited ?? 0;

    if (totalDeposited < offer.rechargeAmount) {
      return res.status(400).json({
        code: -1,
        msg: `Deposit at least ${offer.rechargeAmount} to claim this bonus`,
        serviceNowTime: formatTimestamp(new Date()),
      });
    }

    const existing = await FirstDepositBonusClaim.findOne({
      user: userId,
      offerId: offer.id,
    });
    if (existing) {
      return res.status(400).json({
        code: -1,
        msg: "Bonus already claimed",
        serviceNowTime: formatTimestamp(new Date()),
      });
    }

    await FirstDepositBonusClaim.create({
      user: userId,
      offerId: offer.id,
      rewardAmount: offer.rewardAmount,
      rechargeAmount: offer.rechargeAmount,
    });

    await User.findByIdAndUpdate(
      userId,
      { $inc: { walletBalance: offer.rewardAmount } },
    );

    return res.status(200).json({
      code: 0,
      msg: "Succeed",
      data: { rewardAmount: offer.rewardAmount },
      serviceNowTime: formatTimestamp(new Date()),
    });
  } catch (err) {
    console.error("claimFirstDepositBonus error:", err);
    return res.status(500).json({
      code: -1,
      msg: err.message || "Internal server error",
      serviceNowTime: formatTimestamp(new Date()),
    });
  }
};
