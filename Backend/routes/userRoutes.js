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
router.post("/logout", logout); // Logout user
router.get("/user-info", authenticateToken, getUserInfo); // Get user information, protected by auth

export default router;
