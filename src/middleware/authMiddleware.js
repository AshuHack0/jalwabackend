import { verifyToken } from "../utils/jwt.js";
import User from "../models/User.js";
import { logErrorToDbAsync } from "../utils/logErrorToDb.js";

// Protects routes by validating JWT token and attaching the user.
export const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Not authorized to access this route",
        });
    }

    try {
        const decoded = verifyToken(token);

        req.user = await User.findById(decoded.id);

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "No user found with this id",
            });
        }

        next();
    } catch (error) {
        logErrorToDbAsync(error, { source: "auth", context: { action: "protect" }, req });
        return res.status(401).json({
            success: false,
            message: "Not authorized to access this route",
        });
    }
};

// Optionally attaches user if valid token present. Does not fail if no/invalid token.
export const optionalProtect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = verifyToken(token);
    req.user = await User.findById(decoded.id);
  } catch {
    req.user = null;
  }
  next();
};

// Restricts access to users whose role is included in the given roles.
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role ${req.user.role} is not authorized to access this route`,
            });
        }
        next();
    };
};
