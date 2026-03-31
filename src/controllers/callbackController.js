import Deposit from "../models/Deposit.js";
import User from "../models/User.js";
import { verifyMcgindiamcCallbackSignature } from "../services/mcgindiamcService.js";
import { verifyOxoxmgCallbackSignature } from "../services/oxoxmgService.js";
import { verifyUsdtCallbackSignature } from "../services/usdtService.js";
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
export const handleMcgCallback = async (req, res) => {
  console.log("handleMcgCallback======>>>",req.body)
  console.log("handleMcgCallback headers======>>>",req.headers)
  try {
    const urlPath = "/api/v1/payments/mcgindiamc-callback";
    const isValid = verifyMcgindiamcCallbackSignature("POST", urlPath, req.headers);

    console.log("isValid====>",isValid)

    if (!isValid) {
      logErrorToDbAsync(new Error("Invalid payment callback signature"), {
        source: "mcgCallback",
        context: { headers: req.headers, body: req.body },
      });
      // Still return success to avoid gateway retries leaking info
      return res.status(200).send("success");
    }

    const { orderno, merchantorder, fee, proof, status } = req.body;

    if (!merchantorder || !status) {
      return res.status(200).send("success");
    }

    // Find the deposit by our merchant order number
    const deposit = await Deposit.findOne({ merchantOrderNo: merchantorder, gateway: "mcgindiamc" });

    if (!deposit) {
      // Could be a duplicate callback for an already-processed order — log and ack
      logErrorToDbAsync(new Error("Callback received for unknown order"), {
        source: "mcgCallback",
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
      source: "mcgCallback",
      context: { body: req.body },
    });
    return res.status(200).send("success");
  }
};

/**
 * POST /api/v1/payments/oxoxmg-callback
 *
 * Called by Oxoxmg gateway when a deposit order's status changes.
 */
export const handleOxoxmgCallback = async (req, res) => {
  console.log("handleOxoxmgCallback======>>>", req.body);
  try {
    const isValid = verifyOxoxmgCallbackSignature(req.body);

    if (!isValid) {
      logErrorToDbAsync(new Error("Invalid Oxoxmg callback signature"), {
        source: "oxoxmgCallback",
        context: { headers: req.headers, body: req.body },
      });
      return res.status(200).send("success");
    }

    const { orderno, merchant_orderno, fee, utr, status } = req.body;

    if (!merchant_orderno || !status) {
      return res.status(200).send("success");
    }

    const deposit = await Deposit.findOne({ merchantOrderNo: merchant_orderno, gateway: "oxoxmg" });

    if (!deposit) {
      logErrorToDbAsync(new Error("Oxoxmg callback received for unknown order"), {
        source: "oxoxmgCallback",
        context: { merchant_orderno, orderno, status },
      });
      return res.status(200).send("success");
    }

    if (deposit.status === "completed" || deposit.status === "failed") {
      return res.status(200).send("success");
    }

    if (status === "success") {
      deposit.status = "completed";
      deposit.proof = utr || null;
      deposit.fee = fee ?? deposit.fee;
      deposit.gatewayOrderNo = orderno || deposit.gatewayOrderNo;
      await deposit.save();

      await User.findByIdAndUpdate(deposit.user, {
        $inc: {
          walletBalance: deposit.amount,
          totalDeposited: deposit.amount,
        },
      });
    } else if (status === "fail") {
      deposit.status = "failed";
      deposit.gatewayOrderNo = orderno || deposit.gatewayOrderNo;
      await deposit.save();
    }

    return res.status(200).send("success");
  } catch (error) {
    logErrorToDbAsync(error, {
      source: "oxoxmgCallback",
      context: { body: req.body },
    });
    return res.status(200).send("success");
  }
};

/**
 * POST /api/v1/payments/usdt-callback
 *
 * Called by the USDT gateway when a deposit order's status changes.
 *
 * Callback body from gateway:
 * {
 *   orderno:       string  (gateway order number)
 *   merchantorder: string  (our merchant order number)
 *   currency:      string  ("usdt")
 *   network:       string  ("TRC20" | "ERC20" | "BEP20")
 *   amount:        number
 *   fee:           number
 *   proof:         string  (txHash)
 *   status:        string  ("success" | "fail" | "exception")
 *   createtime:    string
 *   updatetime:    string
 * }
 */
export const handleUsdtCallback = async (req, res) => {
  console.log("handleUsdtCallback ======>>>", req.body);
  console.log("handleUsdtCallback headers ======>>>", req.headers);
  try {
    const urlPath = "/api/v1/payments/usdt-callback";
    const isValid = verifyUsdtCallbackSignature("POST", urlPath, req.headers);

    console.log("USDT callback isValid ====>", isValid);

    if (!isValid) {
      logErrorToDbAsync(new Error("Invalid USDT callback signature"), {
        source: "usdtCallback",
        context: { headers: req.headers, body: req.body },
      });
      return res.status(200).send("success");
    }

    const { orderno, merchantorder, fee, proof, status } = req.body;

    if (!merchantorder || !status) {
      return res.status(200).send("success");
    }

    const deposit = await Deposit.findOne({ merchantOrderNo: merchantorder, gateway: "usdt" });

    if (!deposit) {
      logErrorToDbAsync(new Error("USDT callback received for unknown order"), {
        source: "usdtCallback",
        context: { merchantorder, orderno, status },
      });
      return res.status(200).send("success");
    }

    if (deposit.status === "completed" || deposit.status === "failed") {
      return res.status(200).send("success");
    }

    if (status === "success") {
      deposit.status = "completed";
      deposit.proof = proof || null;
      deposit.fee = fee ?? deposit.fee;
      deposit.gatewayOrderNo = orderno || deposit.gatewayOrderNo;
      await deposit.save();

      await User.findByIdAndUpdate(deposit.user, {
        $inc: {
          walletBalance: deposit.amount,
          totalDeposited: deposit.amount,
        },
      });
    } else if (status === "fail" || status === "exception") {
      deposit.status = "failed";
      deposit.gatewayOrderNo = orderno || deposit.gatewayOrderNo;
      await deposit.save();
    }

    return res.status(200).send("success");
  } catch (error) {
    logErrorToDbAsync(error, {
      source: "usdtCallback",
      context: { body: req.body },
    });
    return res.status(200).send("success");
  }
};
