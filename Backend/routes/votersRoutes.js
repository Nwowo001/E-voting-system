import express from "express";
import { pool } from "../dbConfig.js";
import { authenticateToken, adminOnly } from "../middlewares/authMiddleware.js";
import {
  recordVote,
  getVotes,
  getUserVotes,
  castVote,
  deleteInactiveVoters,
} from "../controllers/votesController.js";

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

// Get vote counts
router.get("/counts", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM votecounts");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cast vote
router.post("/vote", authenticateToken, recordVote);

// Get all votes
router.get("/votes", authenticateToken, getVotes);

// Get user-specific votes
router.get("/votes/user/:userId", authenticateToken, getUserVotes);

// Simplified vote cast endpoint
router.post("/votes", authenticateToken, recordVote); // Unified endpoint for recording votes
router.get("/votes", authenticateToken, getVotes);
router.get("/votes/user/:userId", authenticateToken, getUserVotes);
router.get("/votes/user", authenticateToken, async (req, res) => {
  try {
    const voterId = req.user.id; // Use the ID from the authenticated user
    const result = await pool.query("SELECT * FROM votes WHERE voterid = $1", [
      voterId,
    ]);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching user votes:", error.message);
    res.status(500).json({ error: "Failed to fetch user votes" });
  }
});

// Now we can pass io dynamically, for example:
router.post("/votes", (req, res) => recordVote(req, res, req.io)); // Use req.io instead of importing io directly
router.delete("/inactive", authenticateToken, adminOnly, deleteInactiveVoters);

export default router;
