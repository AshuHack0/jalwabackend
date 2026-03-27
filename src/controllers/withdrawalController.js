import { v4 as uuidv4 } from "uuid";
import Withdrawal from "../models/Withdrawal.js";
import User from "../models/User.js";
import { createPayoutOrder } from "../services/paymentService.js";
import { env } from "../config/env.js";

const MIN_WITHDRAWAL = 100;
const MAX_WITHDRAWAL = 50000;

// POST /api/v1/withdrawals/initiate — authenticated user requests a bank withdrawal
export const initiateWithdrawal = async (req, res, next) => {
  try {
    const { amount } = req.body;

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    const withdrawAmount = parseFloat(amount);

    if (withdrawAmount < MIN_WITHDRAWAL || withdrawAmount > MAX_WITHDRAWAL) {
      return res.status(400).json({
        success: false,
        message: `Withdrawal amount must be between ₹${MIN_WITHDRAWAL} and ₹${MAX_WITHDRAWAL}`,
      });
    }

    const freshUser = await User.findById(req.user._id);
    if (!freshUser) return res.status(404).json({ success: false, message: "User not found" });

    if (freshUser.walletBalance < withdrawAmount) {
      return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
    }

    if (!freshUser.bankName || !freshUser.accountNumber || !freshUser.ifscCode || !freshUser.accountHolder) {
      return res.status(400).json({
        success: false,
        message: "Please add your bank account details before withdrawing",
      });
    }

    const merchantOrderNo = `WD${Date.now()}${uuidv4().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    const notifyUrl = `${env.BACKEND_URL}/api/v1/payments/payout-callback`;

    // Deduct from wallet (hold funds)
    await User.findByIdAndUpdate(freshUser._id, {
      $inc: { walletBalance: -withdrawAmount },
    });

    let gatewayResult;
    try {
      gatewayResult = await createPayoutOrder({
        merchantOrderNo,
        amount: withdrawAmount,
        name: freshUser.accountHolder,
        bankName: freshUser.bankName,
        bankAccount: freshUser.accountNumber,
        ifsc: freshUser.ifscCode,
        notifyUrl,
      });

      console.log("gatewayResult widrawel====>>", gatewayResult)
    } catch (err) {
      // Refund wallet if gateway fails
      await User.findByIdAndUpdate(freshUser._id, {
        $inc: { walletBalance: withdrawAmount },
      });
      console.error("[initiateWithdrawal] Gateway error:", err);
      return res.status(502).json({
        success: false,
        message: `Payment gateway error: ${err.message}`,
      });
    }

    const withdrawal = await Withdrawal.create({
      user: freshUser._id,
      phone: freshUser.phone,
      amount: withdrawAmount,
      status: "pending",
      orderId: merchantOrderNo,
      paymentRef: gatewayResult.orderNo || null,
      bankName: freshUser.bankName,
      accountHolder: freshUser.accountHolder,
      accountNumber: freshUser.accountNumber,
      ifscCode: freshUser.ifscCode,
    });

    res.status(201).json({
      success: true,
      message: "Withdrawal initiated successfully",
      data: {
        withdrawalId: withdrawal._id,
        merchantOrderNo,
        gatewayOrderNo: gatewayResult.orderNo,
        amount: withdrawAmount,
        fee: gatewayResult.fee || 0,
        status: "pending",
      },
    });
  } catch (error) {
    console.error("[initiateWithdrawal] Unexpected error:", error);
    next(error);
  }
};

// GET /api/v1/withdrawals/my — get authenticated user's withdrawal history
export const getMyWithdrawals = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select("-__v"),
      Withdrawal.countDocuments({ user: req.user._id }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        withdrawals,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /withdrawals?status=pending — list withdrawals
export const listWithdrawals = async (req, res, next) => {
    try {
        const { status = "pending", page = 1, limit = 50, search = "" } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const filter = { status };

        const [withdrawals, total] = await Promise.all([
            Withdrawal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
            Withdrawal.countDocuments(filter),
        ]);

        const results = search
            ? withdrawals.filter((w) => w.phone?.includes(search) || w.orderId?.includes(search))
            : withdrawals;

        res.status(200).json({ success: true, data: { withdrawals: results, total } });
    } catch (error) {
        next(error);
    }
};

// PATCH /withdrawals/:id/approve — approve, mark sent
export const approveWithdrawal = async (req, res, next) => {
    try {
        const withdrawal = await Withdrawal.findById(req.params.id);
        if (!withdrawal) return res.status(404).json({ success: false, message: "Withdrawal not found" });
        if (withdrawal.status !== "pending") return res.status(400).json({ success: false, message: "Withdrawal is not pending" });

        withdrawal.status = "approved";
        if (req.body.paymentRef) withdrawal.paymentRef = req.body.paymentRef;
        await withdrawal.save();

        res.status(200).json({ success: true, message: "Withdrawal approved" });
    } catch (error) {
        next(error);
    }
};

// PATCH /withdrawals/:id/reject — reject and refund wallet
export const rejectWithdrawal = async (req, res, next) => {
    try {
        const withdrawal = await Withdrawal.findById(req.params.id);
        if (!withdrawal) return res.status(404).json({ success: false, message: "Withdrawal not found" });
        if (withdrawal.status !== "pending") return res.status(400).json({ success: false, message: "Withdrawal is not pending" });

        withdrawal.status = "rejected";
        if (req.body.remark) withdrawal.remark = req.body.remark;
        await withdrawal.save();

        // Refund wallet
        await User.findByIdAndUpdate(withdrawal.user, {
            $inc: { walletBalance: withdrawal.amount },
        });

        res.status(200).json({ success: true, message: "Withdrawal rejected and wallet refunded" });
    } catch (error) {
        next(error);
    }
};
