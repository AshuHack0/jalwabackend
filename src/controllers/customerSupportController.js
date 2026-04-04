import SupportTicket from "../models/SupportTicket.js";

// Helper: extract file info from multer disk-storage files
// Each file has: fieldname, originalname, mimetype, size, filename, path
const mapFiles = (files = {}) =>
  Object.entries(files).flatMap(([fieldName, arr]) =>
    arr.map(({ originalname, mimetype, size, filename }) => ({
      fieldName,
      originalName: originalname,
      mimetype,
      size,
      // Publicly accessible URL via the /uploads static route
      url: `/uploads/support/${filename}`,
    }))
  );

// POST /api/v1/customer-support/deposit-report
export const submitDepositReport = async (req, res, next) => {
  try {
    const { userId, orderId } = req.body;
    if (!userId || !orderId) {
      return res.status(400).json({ success: false, message: "userId and orderId are required" });
    }

    const ticket = await SupportTicket.create({
      user: req.user._id,
      type: "deposit-report",
      fields: { userId, orderId },
      files: mapFiles(req.files),
    });

    res.status(201).json({ success: true, message: "Deposit report submitted", data: { ticketId: ticket._id } });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/customer-support/submit-statement
export const submitStatement = async (req, res, next) => {
  try {
    const { userId, orderId } = req.body;
    if (!userId || !orderId) {
      return res.status(400).json({ success: false, message: "userId and orderId are required" });
    }

    const ticket = await SupportTicket.create({
      user: req.user._id,
      type: "withdrawal-statement",
      fields: { userId, orderId },
      files: mapFiles(req.files),
    });

    res.status(201).json({ success: true, message: "Bank statement submitted", data: { ticketId: ticket._id } });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/customer-support/change-login-password
export const changeLoginPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: "password is required" });
    }

    const ticket = await SupportTicket.create({
      user: req.user._id,
      type: "change-password",
      fields: { password },
      files: mapFiles(req.files),
    });

    res.status(201).json({ success: true, message: "Password change request submitted", data: { ticketId: ticket._id } });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/customer-support/delete-withdraw-bank
export const deleteWithdrawBank = async (req, res, next) => {
  try {
    const { bankAccount } = req.body;
    if (!bankAccount) {
      return res.status(400).json({ success: false, message: "bankAccount is required" });
    }

    const ticket = await SupportTicket.create({
      user: req.user._id,
      type: "delete-withdraw-bank",
      fields: { bankAccount },
      files: mapFiles(req.files),
    });

    res.status(201).json({ success: true, message: "Bank deletion request submitted", data: { ticketId: ticket._id } });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/customer-support/delete-upi-rebind
export const deleteUpiRebind = async (req, res, next) => {
  try {
    const { upi } = req.body;
    if (!upi) {
      return res.status(400).json({ success: false, message: "upi is required" });
    }

    const ticket = await SupportTicket.create({
      user: req.user._id,
      type: "delete-upi-rebind",
      fields: { upi },
      files: mapFiles(req.files),
    });

    res.status(201).json({ success: true, message: "UPI deletion request submitted", data: { ticketId: ticket._id } });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/customer-support/delete-usdt-rebind
export const deleteUsdtRebind = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.create({
      user: req.user._id,
      type: "delete-usdt-rebind",
      fields: {},
      files: mapFiles(req.files),
    });

    res.status(201).json({ success: true, message: "USDT deletion request submitted", data: { ticketId: ticket._id } });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/customer-support/modify-ifsc
export const modifyIfsc = async (req, res, next) => {
  try {
    const { ifsc, bankNumber } = req.body;
    if (!ifsc || !bankNumber) {
      return res.status(400).json({ success: false, message: "ifsc and bankNumber are required" });
    }

    const ticket = await SupportTicket.create({
      user: req.user._id,
      type: "modify-ifsc",
      fields: { ifsc, bankNumber },
      files: [],
    });

    res.status(201).json({ success: true, message: "IFSC modification request submitted", data: { ticketId: ticket._id } });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/customer-support/change-bank-name
export const changeBankName = async (req, res, next) => {
  try {
    const { bankName, bankNumber } = req.body;
    if (!bankName || !bankNumber) {
      return res.status(400).json({ success: false, message: "bankName and bankNumber are required" });
    }

    const ticket = await SupportTicket.create({
      user: req.user._id,
      type: "change-bank-name",
      fields: { bankName, bankNumber },
      files: [],
    });

    res.status(201).json({ success: true, message: "Bank name change request submitted", data: { ticketId: ticket._id } });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/customer-support/my-tickets
export const getMyTickets = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { user: req.user._id };
    if (status) filter.status = status;

    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select("-__v"),
      SupportTicket.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: { tickets, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};
