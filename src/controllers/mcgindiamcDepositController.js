import { v4 as uuidv4 } from "uuid";
import Deposit from "../models/Deposit.js";
import User from "../models/User.js";
import { createMcgindiamcOrder, queryMcgindiamcOrder } from "../services/mcgindiamcService.js";
import { env } from "../config/env.js";

/**
 * POST /api/v1/deposits/initiate
 * User initiates a real-money deposit via the payment gateway.
 * Returns a payUrl to redirect the user to the cashier.
 */
export const initiateMcgindiamcDeposit = async (req, res, next) => {
  try {
    const { amount } = req.validated;
    const user = req.user;

    // Generate a unique merchant-side order number
    const merchantOrderNo = `JW${Date.now()}${uuidv4().replace(/-/g, "").slice(0, 8).toUpperCase()}`;

    const callbackUrl = `${env.BACKEND_URL}/api/v1/payments/mcgindiamc-callback`;
    const jumpUrl = `${env.APP_FRONTEND_URL}/deposit/status/${merchantOrderNo}`;

    // Create the order in gateway first
    let gatewayResult;
    try {
      gatewayResult = await createMcgindiamcOrder({
        merchantOrderNo,
        amount,
        callbackUrl,
        jumpUrl,
      });

      console.log("createMcgindiamcOrder======>>>",gatewayResult)
    } catch (err) {
      console.error("[initiateMcgindiamcDeposit] Gateway error:", err);
      return res.status(502).json({
        success: false,
        message: `Payment gateway error: ${err.message}`,
      });
    }

    // Save deposit record in our DB
    const deposit = await Deposit.create({
      user: user._id,
      amount,
      status: "pending",
      orderId: merchantOrderNo,
      gatewayOrderNo: gatewayResult.orderNo,
      merchantOrderNo,
      payUrl: gatewayResult.payUrl,
      channelCode: String(gatewayResult.channelCode || env.MCGINDIAMC_CHANNEL_CODE),
      fee: gatewayResult.fee || 0,
      expireTime: gatewayResult.expireTime || 1800,
      isGatewayPayment: true,
      gateway: "mcgindiamc",
    });

    res.status(201).json({
      success: true,
      message: "Deposit order created. Redirect user to payUrl.",
      data: {
        depositId: deposit._id,
        merchantOrderNo,
        gatewayOrderNo: gatewayResult.orderNo,
        amount,
        fee: gatewayResult.fee || 0,
        payUrl: gatewayResult.payUrl,
        expireTime: gatewayResult.expireTime || 1800,
        status: "pending",
      },
    });
  } catch (error) {
    console.error("[initiateMcgindiamcDeposit] Unexpected error:", error);
    next(error);
  }
};

/**
 * GET /api/v1/deposits/status/:merchantOrderNo
 * User polls the status of their deposit.
 */
export const getMcgindiamcDepositStatus = async (req, res, next) => {
  try {
    const { merchantOrderNo } = req.params;
    const user = req.user;

    const deposit = await Deposit.findOne({
      merchantOrderNo,
      user: user._id,
      gateway: "mcgindiamc",
    });

    if (!deposit) {
      return res.status(404).json({ success: false, message: "Deposit not found" });
    }

    // If still pending and is a gateway payment, check gateway for latest status
    if (deposit.status === "pending" && deposit.isGatewayPayment && deposit.gatewayOrderNo) {
      try {
        const gatewayStatus = await queryMcgindiamcOrder(deposit.gatewayOrderNo);

        if (gatewayStatus.status === "success") {
          // Callback may have been missed — credit wallet here as a fallback
          deposit.status = "completed";
          deposit.proof = gatewayStatus.proof || deposit.proof;
          deposit.gatewayOrderNo = gatewayStatus.orderno || deposit.gatewayOrderNo;
          await deposit.save();

          await User.findByIdAndUpdate(deposit.user, {
            $inc: { walletBalance: deposit.amount, totalDeposited: deposit.amount },
          });
        } else if (gatewayStatus.status === "failed") {
          deposit.status = "failed";
          await deposit.save();
        }
      } catch (queryErr) {
        console.error("[getMcgindiamcDepositStatus] Gateway query error:", queryErr);
        // Return cached status, don't block the response
      }
    }

    res.status(200).json({
      success: true,
      data: {
        depositId: deposit._id,
        merchantOrderNo: deposit.merchantOrderNo,
        gatewayOrderNo: deposit.gatewayOrderNo,
        amount: deposit.amount,
        fee: deposit.fee,
        status: deposit.status,
        proof: deposit.proof,
        payUrl: deposit.payUrl,
        expireTime: deposit.expireTime,
        createdAt: deposit.createdAt,
        updatedAt: deposit.updatedAt,
      },
    });
  } catch (error) {
    console.error("[getMcgindiamcDepositStatus] Unexpected error:", error);
    next(error);
  }
};

/**
 * GET /api/v1/deposits/my
 * Returns the authenticated user's deposit history.
 */
export const getMcgindiamcMyDeposits = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [deposits, total] = await Promise.all([
      Deposit.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select("-__v"),
      Deposit.countDocuments({ user: req.user._id }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        deposits,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("[getMcgindiamcMyDeposits] Unexpected error:", error);
    next(error);
  }
};
