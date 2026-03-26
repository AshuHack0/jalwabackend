import User from "../models/User.js";

const BANK_FIELDS = "bankName accountHolder accountNumber ifscCode bankPhone bankEmail";

/**
 * POST /api/v1/bank-account
 * Save or update the authenticated user's bank account details.
 */
export const addBankAccount = async (req, res) => {
  try {
    const { bankName, accountHolder, accountNumber, ifscCode, bankPhone, bankEmail } = req.body;

    if (!bankName || !accountHolder || !accountNumber || !ifscCode) {
      return res.status(400).json({
        success: false,
        message: "bankName, accountHolder, accountNumber, and ifscCode are required.",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { bankName, accountHolder, accountNumber, ifscCode, bankPhone: bankPhone || "", bankEmail: bankEmail || "" },
      { new: true, select: BANK_FIELDS }
    );

    return res.status(200).json({
      success: true,
      message: "Bank account saved successfully.",
      data: { bankAccount: user },
    });
  } catch (err) {
    console.error("[addBankAccount] Error:", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

/**
 * GET /api/v1/bank-account
 * Get the authenticated user's saved bank account details.
 */
export const getBankAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(BANK_FIELDS);

    return res.status(200).json({
      success: true,
      data: { bankAccount: user },
    });
  } catch (err) {
    console.error("[getBankAccount] Error:", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
