import express from "express";
import { pool } from "../dbConfig.js";
import { authenticateToken, adminOnly } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Get all voters (admin only)
router.get("/", authenticateToken, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, voterID, nin, verified, created_at FROM users WHERE role = $1 ORDER BY created_at DESC",
      ["voter"]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching voters:", error.message);
    res.status(500).json({ message: "Failed to fetch voters." });
  }
});

// Verify voter (admin only)
router.put("/:id/verify", authenticateToken, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE users SET verified = true WHERE id = $1 AND role = $2 RETURNING id, name, email, nin, voter_id, verified",
      [req.params.id, "voter"]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Voter not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error verifying voter:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/counts", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM votecounts");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
export default router;
