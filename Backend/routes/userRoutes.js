// userRoutes.js
import express from "express";
import { pool } from "../dbConfig.js";
import {
  signUp,
  login,
  logout,
  getUserInfo,
} from "../controllers/userController.js";

import { adminOnly, authenticateToken } from "../middlewares/authMiddleware.js"; // Ensure this middleware exists
const router = express.Router();

router.post("/sign-up", signUp); // Register a new user
router.post("/login", login); // User login
router.post("/logout", authenticateToken, (req, res) => {
  try {
    // Clear the user session or token
    res.clearCookie("connect.sid"); // Clear the session cookie
    res.clearCookie("authToken"); // Clear JWT token if used in cookies
    req.session.destroy(() => {
      res.status(200).json({ message: "Logout successful" });
    });
  } catch (error) {
    console.error("Logout error:", error.message);
    res.status(500).json({ error: "Logout failed" });
  }
});
router.get("/user-info", authenticateToken, getUserInfo); // Get user information, protected by auth

export default router;
