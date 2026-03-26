import Deposit from "../models/Deposit.js";
import User from "../models/User.js";
import { verifyCallbackSignature } from "../services/paymentService.js";
import { logErrorToDbAsync } from "../utils/logErrorToDb.js";

/**
 * POST /api/v1/payments/callback
 *
 * Called by the payment gateway when a deposit order's status changes.
 * The gateway expects the response body to be the string "success" on success.
 *
 * Callback body from gateway:
 * {
 *   orderno:       string  (gateway order number)
 *   merchantorder: string  (our merchant order number)
 *   currency:      string  ("inr")
 *   amount:        number
 *   fee:           number
 *   proof:         string  (UTR for INR)
 *   status:        string  ("success" | "failed" | "processing")
 *   createtime:    string
 *   updatetime:    string
 * }
 */
export const handlePaymentCallback = async (req, res) => {
  console.log("handlePaymentCallback======>>>",req.body)
  console.log("handlePaymentCallback headers======>>>",req.headers)
  try {
    // Verify gateway signature
    const urlPath = "/api/v1/payments/callback";
    const isValid = verifyCallbackSignature("POST", urlPath, req.headers);

    console.log("isValid====>",isValid)

    if (!isValid) {
      logErrorToDbAsync(new Error("Invalid payment callback signature"), {
        source: "paymentCallback",
        context: { headers: req.headers, body: req.body },
      });
      // Still return success to avoid gateway retries leaking info
      return res.status(200).send("success");
    }

    const { orderno, merchantorder, currency, amount, fee, proof, status } = req.body;

    if (!merchantorder || !status) {
      return res.status(200).send("success");
    }

    // Find the deposit by our merchant order number
    const deposit = await Deposit.findOne({ merchantOrderNo: merchantorder });

    if (!deposit) {
      // Could be a duplicate callback for an already-processed order — log and ack
      logErrorToDbAsync(new Error("Callback received for unknown order"), {
        source: "paymentCallback",
        context: { merchantorder, orderno, status },
      });
      return res.status(200).send("success");
    }

    // Ignore duplicate callbacks for already-finalized deposits
    if (deposit.status === "completed" || deposit.status === "failed") {
      return res.status(200).send("success");
    }

    if (status === "success") {
      // Update deposit
      deposit.status = "completed";
      deposit.proof = proof || null;
      deposit.fee = fee ?? deposit.fee;
      deposit.gatewayOrderNo = orderno || deposit.gatewayOrderNo;
      await deposit.save();

      // Credit user's wallet
      await User.findByIdAndUpdate(deposit.user, {
        $inc: {
          walletBalance: deposit.amount,
          totalDeposited: deposit.amount,
        },
      });
    } else if (status === "failed") {
      deposit.status = "failed";
      deposit.gatewayOrderNo = orderno || deposit.gatewayOrderNo;
      await deposit.save();
    }
    // "processing" — no state change, gateway will callback again

    return res.status(200).send("success");
  } catch (error) {
    logErrorToDbAsync(error, {
      source: "paymentCallback",
      context: { body: req.body },
    });
    // Always return "success" so the gateway doesn't keep retrying
    return res.status(200).send("success");
  }
};
