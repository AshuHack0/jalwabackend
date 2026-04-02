import { v4 as uuidv4 } from "uuid";
import Deposit from "../models/Deposit.js";
import User from "../models/User.js";
import { createUsdtDepositOrder, queryUsdtDepositOrder } from "../services/usdtService.js";
import { env } from "../config/env.js";

/**
 * POST /api/v1/usdt/deposits/initiate
 * User initiates a USDT deposit.
 * Returns a wallet address for the user to send USDT to.
 */
export const initiateUsdtDeposit = async (req, res, next) => {
  try {
    const { amount, network } = req.validated;
    const user = req.user;

    const merchantOrderNo = `USDT${Date.now()}${uuidv4().replace(/-/g, "").slice(0, 8).toUpperCase()}`;

    const callbackUrl = `${env.BACKEND_URL}/api/v1/payments/usdt-callback`;
    const jumpUrl = `${env.APP_FRONTEND_URL}/deposit/usdt-status/${merchantOrderNo}`;

    let gatewayResult;
    try {
      gatewayResult = await createUsdtDepositOrder({
        merchantOrderNo,
        amount,
        callbackUrl,
        jumpUrl,
      });

      console.log("createUsdtDepositOrder ======>>>", gatewayResult);
    } catch (err) {
      console.error("[initiateUsdtDeposit] Gateway error:", err);
      return res.status(502).json({
        success: false,
        message: `USDT payment gateway error: ${err.message}`,
      });
    }

    const deposit = await Deposit.create({
      user: user._id,
      amount,
      status: "pending",
      orderId: merchantOrderNo,
      gatewayOrderNo: gatewayResult.orderNo,
      merchantOrderNo,
      payUrl: gatewayResult.address || gatewayResult.payUrl,   // wallet address (USDT) or cashier URL
      channelCode: network,
      fee: gatewayResult.fee || 0,
      expireTime: gatewayResult.expireTime || null,
      isGatewayPayment: true,
      gateway: "usdt",
    });

    res.status(201).json({
      success: true,
      message: "USDT deposit order created. Send USDT to the address below.",
      data: {
        depositId: deposit._id,
        merchantOrderNo,
        orderId: gatewayResult.orderNo,
        amount,
        currency: "usdt",
        network,
        address: gatewayResult.address || gatewayResult.payUrl,
        qrCode: gatewayResult.qrCode || null,
        expireTime: gatewayResult.expireTime || null,
        status: "pending",
      },
    });
  } catch (error) {
    console.error("[initiateUsdtDeposit] Unexpected error:", error);
    next(error);
  }
};

/**
 * GET /api/v1/usdt/deposits/status/:merchantOrderNo
 * User polls the status of their USDT deposit.
 */
export const getUsdtDepositStatus = async (req, res, next) => {
  try {
    const { merchantOrderNo } = req.params;
    const user = req.user;

    const deposit = await Deposit.findOne({
      merchantOrderNo,
      user: user._id,
      gateway: "usdt",
    });

    if (!deposit) {
      return res.status(404).json({ success: false, message: "Deposit not found" });
    }

    if (deposit.status === "pending" && deposit.isGatewayPayment && deposit.gatewayOrderNo) {
      try {
        const gatewayStatus = await queryUsdtDepositOrder(deposit.gatewayOrderNo);

        if (gatewayStatus.status === "success") {
          deposit.status = "completed";
          deposit.proof = gatewayStatus.proof || deposit.proof;
          deposit.gatewayOrderNo = gatewayStatus.orderno || deposit.gatewayOrderNo;
          await deposit.save();

          await User.findByIdAndUpdate(deposit.user, {
            $inc: { walletBalance: deposit.amount, totalDeposited: deposit.amount },
          });
        } else if (["fail", "timeOut", "exception"].includes(gatewayStatus.status)) {
          deposit.status = "failed";
          await deposit.save();
        }
      } catch (queryErr) {
        console.error("[getUsdtDepositStatus] Gateway query error:", queryErr);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        depositId: deposit._id,
        merchantOrderNo: deposit.merchantOrderNo,
        orderId: deposit.gatewayOrderNo,
        amount: deposit.amount,
        currency: "usdt",
        network: deposit.channelCode,
        address: deposit.payUrl,
        fee: deposit.fee,
        proof: deposit.proof,
        status: deposit.status,
        expireTime: deposit.expireTime,
        createdAt: deposit.createdAt,
        updatedAt: deposit.updatedAt,
      },
    });
  } catch (error) {
    console.error("[getUsdtDepositStatus] Unexpected error:", error);
    next(error);
  }
};

/**
 * GET /api/v1/usdt/deposits/my
 * Returns the authenticated user's USDT deposit history.
 */
export const getMyUsdtDeposits = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [deposits, total] = await Promise.all([
      Deposit.find({ user: req.user._id, gateway: "usdt" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select("-__v"),
      Deposit.countDocuments({ user: req.user._id, gateway: "usdt" }),
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
    console.error("[getMyUsdtDeposits] Unexpected error:", error);
    next(error);
  }
};
