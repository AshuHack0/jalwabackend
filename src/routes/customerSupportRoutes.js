import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { protect } from "../middleware/authMiddleware.js";
import {
  submitDepositReport,
  submitStatement,
  changeLoginPassword,
  deleteWithdrawBank,
  deleteUpiRebind,
  deleteUsdtRebind,
  modifyIfsc,
  changeBankName,
  getMyTickets,
} from "../controllers/customerSupportController.js";

const router = express.Router();

// Upload directory: <project-root>/uploads/support/
const UPLOAD_DIR = path.resolve("uploads/support");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const ext = path.extname(file.originalname)
    cb(null, `${unique}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error(`File type ${file.mimetype} not allowed`))
  },
});

// All routes require authentication
router.use(protect);

router.post("/deposit-report",        upload.fields([{ name: "receipt", maxCount: 1 }]),                                                                                     submitDepositReport);
router.post("/submit-statement",      upload.fields([{ name: "bankStatement", maxCount: 1 }]),                                                                               submitStatement);
router.post("/change-login-password", upload.fields([{ name: "depositProof", maxCount: 1 }, { name: "identitySelfie", maxCount: 1 }, { name: "passbookSelfie", maxCount: 1 }]), changeLoginPassword);
router.post("/delete-withdraw-bank",  upload.fields([{ name: "selfie", maxCount: 1 }, { name: "passbook", maxCount: 1 }, { name: "receipt", maxCount: 1 }]),                  deleteWithdrawBank);
router.post("/delete-upi-rebind",     upload.fields([{ name: "registeredUpi", maxCount: 1 }, { name: "depositProof", maxCount: 1 }, { name: "oldUpiSelfie", maxCount: 1 }, { name: "idSelfie", maxCount: 1 }]), deleteUpiRebind);
router.post("/delete-usdt-rebind",    upload.fields([{ name: "selfieUsdt", maxCount: 1 }, { name: "selfieId", maxCount: 1 }, { name: "receipt", maxCount: 1 }]),               deleteUsdtRebind);
router.post("/modify-ifsc",           modifyIfsc);
router.post("/change-bank-name",      changeBankName);
router.get("/my-tickets",             getMyTickets);

export default router;
