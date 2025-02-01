// userRoutes.js
import express from "express";
import { pool } from "../dbConfig.js";
import multer from "multer";
import {
  signUp,
  login,
  logout,
  getUserInfo,
  uploadProfileImage,
} from "../controllers/userController.js";

import { adminOnly, authenticateToken } from "../middlewares/authMiddleware.js"; // Ensure this middleware exists

const router = express.Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/profiles"); // Ensure this folder exists in your project root
  },
  filename: (req, file, cb) => {
    cb(null, `profile_${req.user.id}_${Date.now()}${file.originalname}`);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed"), false);
    }
  },
});
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // Get user ID from authenticated session
    const { name, email, display_name } = req.body;

    const result = await pool.query(
      `UPDATE users 
       SET name = $1, email = $2, display_name = $3
       WHERE userid = $4 
       RETURNING *`,
      [name, email, display_name, userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});
router.post("/update-profile", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email } = req.body;

    const result = await pool.query(
      `UPDATE users 
       SET name = $1, email = $2
       WHERE id = $3 
       RETURNING *`,
      [name, email, userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Failed to update profile" });
  }
});

router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, display_name } = req.body;

    const result = await pool.query(
      `UPDATE users 
       SET name = $1, email = $2, display_name = $3
       WHERE userid = $4 
       RETURNING *`,
      [name, email, display_name, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Error updating user profile" });
  }
});

router.post("/sign-up", signUp); // Register a new user
router.post("/login", login); // User login
router.post("/logout", logout);
router.post(
  "/upload-profile-image",
  authenticateToken,
  upload.single("profileImage"), // Ensure field name matches frontend
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const userId = req.user.id;
      const imagePath = `/uploads/profiles/${req.file.filename}`;

      // Update database with image path
      await pool.query(
        "UPDATE users SET profile_image = $1 WHERE id = $2 RETURNING profile_image",
        [imagePath, userId]
      );

      res.status(200).json({
        message: "Profile image uploaded successfully",
        imageUrl: imagePath,
      });
    } catch (error) {
      console.error("Profile image upload error:", error.message);
      res.status(500).json({ error: "Failed to upload profile image" });
    }
  }
);

// router.post("/logout", authenticateToken, (req, res) => {
//   try {
//     // Clear the user session or token
//     res.clearCookie("connect.sid"); // Clear the session cookie
//     res.clearCookie("authToken"); // Clear JWT token if used in cookies
//     req.session.destroy(() => {
//       res.status(200).json({ message: "Logout successful" });
//     });
//   } catch (error) {
//     console.error("Logout error:", error.message);
//     res.status(500).json({ error: "Logout failed" });
//   }
// });
router.get("/user-info", authenticateToken, getUserInfo); // Get user information, protected by auth

export default router;
