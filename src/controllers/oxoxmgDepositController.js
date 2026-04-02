import { v4 as uuidv4 } from "uuid";
import Deposit from "../models/Deposit.js";
import User from "../models/User.js";
import { createOxoxmgOrder, queryOxoxmgOrder } from "../services/oxoxmgService.js";
import { env } from "../config/env.js";

/**
 * POST /api/v1/oxoxmg/deposits/initiate
 * User initiates a deposit via the Oxoxmg gateway.
 */
export const initiateOxoxmgDeposit = async (req, res, next) => {
  try {
    const { amount } = req.body;

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    const depositAmount = parseFloat(amount);
    const user = req.user;

    const merchantOrderNo = `SH${Date.now()}${uuidv4().replace(/-/g, "").slice(0, 8).toUpperCase()}`;

    const notifyUrl = `${env.BACKEND_URL}/api/v1/payments/oxoxmg-callback`;
    const callbackUrl = `${env.APP_FRONTEND_URL}/deposit/oxoxmg-status/${merchantOrderNo}`;

    let gatewayResult;
    try {
      gatewayResult = await createOxoxmgOrder({
        merchantOrderNo,
        amount: depositAmount,
        notifyUrl,
        callbackUrl,
      });

      console.log("[Oxoxmg] createOxoxmgOrder result:", gatewayResult);
    } catch (err) {
      console.error("[Oxoxmg] initiateOxoxmgDeposit gateway error:", err);
      return res.status(502).json({
        success: false,
        message: `Oxoxmg gateway error: ${err.message}`,
      });
    }

    const deposit = await Deposit.create({
      user: user._id,
      amount: depositAmount,
      status: "pending",
      orderId: merchantOrderNo,
      gatewayOrderNo: gatewayResult.orderno,
      merchantOrderNo,
      payUrl: gatewayResult.payurl,
      channelCode: String(gatewayResult.channelCode || env.OXOXMG_PASSAGE_CODE),
      fee: gatewayResult.fee || 0,
      expireTime: gatewayResult.expireTime || 1800,
      isGatewayPayment: true,
      gateway: "oxoxmg",
    });

    res.status(201).json({
      success: true,
      message: "Oxoxmg deposit order created. Redirect user to payUrl.",
      data: {
        depositId: deposit._id,
        merchantOrderNo,
        gatewayOrderNo: gatewayResult.orderno,
        amount: depositAmount,
        fee: gatewayResult.fee || 0,
        payUrl: gatewayResult.payurl,
        expireTime: gatewayResult.expireTime || 1800,
        status: "pending",
      },
    });
  } catch (error) {
    console.error("[Oxoxmg] initiateOxoxmgDeposit unexpected error:", error);
    next(error);
  }
};

/**
 * GET /api/v1/oxoxmg/deposits/status/:merchantOrderNo
 * Poll status of a Oxoxmg deposit.
 */
export const getOxoxmgDepositStatus = async (req, res, next) => {
  try {
    const { merchantOrderNo } = req.params;
    const user = req.user;

    const deposit = await Deposit.findOne({
      merchantOrderNo,
      user: user._id,
      gateway: "oxoxmg",
    });

    if (!deposit) {
      return res.status(404).json({ success: false, message: "Deposit not found" });
    }

    if (deposit.status === "pending" && deposit.isGatewayPayment) {
      try {
        const gatewayStatus = await queryOxoxmgOrder(deposit.merchantOrderNo);

        if (gatewayStatus.status === "success") {
          deposit.status = "completed";
          deposit.proof = gatewayStatus.utr || deposit.proof;
          deposit.gatewayOrderNo = gatewayStatus.orderno || deposit.gatewayOrderNo;
          await deposit.save();

          await User.findByIdAndUpdate(deposit.user, {
            $inc: { walletBalance: deposit.amount, totalDeposited: deposit.amount },
          });
        } else if (gatewayStatus.status === "fail") {
          deposit.status = "failed";
          await deposit.save();
        }
      } catch (queryErr) {
        console.error("[Oxoxmg] getOxoxmgDepositStatus query error:", queryErr);
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
    console.error("[Oxoxmg] getOxoxmgDepositStatus unexpected error:", error);
    next(error);
  }
};
