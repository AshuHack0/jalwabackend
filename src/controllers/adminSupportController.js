import SupportTicket from "../models/SupportTicket.js";
import User from "../models/User.js";

// GET /api/v1/admin/support-tickets
export const listTickets = async (req, res, next) => {
  try {
    const { type, status, page = 1, limit = 30, search = "" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    // If search provided, find users matching phone/uid then filter by those user IDs
    if (search.trim()) {
      const users = await User.find({
        $or: [
          { phone: { $regex: search.trim(), $options: "i" } },
          { uid: { $regex: search.trim(), $options: "i" } },
        ],
      }).select("_id");
      filter.user = { $in: users.map((u) => u._id) };
    }

    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter)
        .populate("user", "phone uid")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select("-__v"),
      SupportTicket.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        tickets,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/admin/support-tickets/:id/status
export const updateTicketStatus = async (req, res, next) => {
  try {
    const { status, remark } = req.body;

    const allowed = ["pending", "in-progress", "resolved", "rejected"];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${allowed.join(", ")}`,
      });
    }

    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      { status, ...(remark !== undefined ? { remark } : {}) },
      { new: true, runValidators: true }
    ).populate("user", "phone uid");

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    res.json({ success: true, data: { ticket } });
  } catch (err) {
    next(err);
  }
};
