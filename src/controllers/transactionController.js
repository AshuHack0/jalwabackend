import Deposit from "../models/Deposit.js";
import Withdrawal from "../models/Withdrawal.js";

/**
 * GET /api/v1/transactions/my
 * Returns a merged, date-sorted list of the user's deposits and withdrawals.
 *
 * Query params:
 *   page       (default 1)
 *   limit      (default 20)
 *   type       "deposit" | "withdrawal"  (omit for all)
 *   dateRange  "today" | "yesterday" | "last7days" | "last30days" (omit for all)
 */
export const getMyTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, dateRange } = req.query;
    const userId = req.user._id;

    // ── date filter ────────────────────────────────────────────────────────
    let dateFilter = {};
    if (dateRange) {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (dateRange === "today") {
        dateFilter = { createdAt: { $gte: startOfToday } };
      } else if (dateRange === "yesterday") {
        const startOfYesterday = new Date(startOfToday);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);
        dateFilter = { createdAt: { $gte: startOfYesterday, $lt: startOfToday } };
      } else if (dateRange === "last7days") {
        const d = new Date(startOfToday);
        d.setDate(d.getDate() - 6);
        dateFilter = { createdAt: { $gte: d } };
      } else if (dateRange === "last30days") {
        const d = new Date(startOfToday);
        d.setDate(d.getDate() - 29);
        dateFilter = { createdAt: { $gte: d } };
      }
    }

    const baseFilter = { user: userId, ...dateFilter };

    // ── fetch based on type filter ─────────────────────────────────────────
    let deposits = [];
    let withdrawals = [];

    if (!type || type === "deposit") {
      deposits = await Deposit.find({ ...baseFilter, status: "completed" })
        .select("amount createdAt status")
        .lean();
    }

    if (!type || type === "withdrawal") {
      withdrawals = await Withdrawal.find(baseFilter)
        .select("amount createdAt status")
        .lean();
    }

    // ── normalise to a common shape ────────────────────────────────────────
    const normalised = [
      ...deposits.map((d) => ({
        _id: d._id.toString(),
        type: "deposit",
        amount: d.amount,
        detail: "Deposit",
        status: d.status,
        createdAt: d.createdAt,
      })),
      ...withdrawals.map((w) => ({
        _id: w._id.toString(),
        type: "withdrawal",
        amount: w.amount,
        detail: "Withdraw",
        status: w.status,
        createdAt: w.createdAt,
      })),
    ];

    // ── sort newest-first then paginate ────────────────────────────────────
    normalised.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = normalised.length;
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const skip = (pageInt - 1) * limitInt;
    const paginated = normalised.slice(skip, skip + limitInt);

    res.status(200).json({
      success: true,
      data: {
        transactions: paginated,
        total,
        page: pageInt,
        pages: Math.ceil(total / limitInt),
      },
    });
  } catch (error) {
    next(error);
  }
};
