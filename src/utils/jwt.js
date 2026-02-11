import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

// Generates a signed JWT for the given user id.
export const generateToken = (id) =>
  jwt.sign({ id }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

// Verifies a JWT and returns the decoded payload.
export const verifyToken = (token) => jwt.verify(token, env.JWT_SECRET);

