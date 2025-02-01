import express from "express";
import { pool } from "../dbConfig.js";
import {
  getElectionStats,
  getActiveElectionStats,
  getAllElectionsStats,
} from "../controllers/statsController.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Important: Order matters! Put more specific routes first
// Get stats for all elections (must come before :electionId route)
router.get("/elections/all/stats", authenticateToken, getAllElectionsStats);

// Get stats for active elections (must come before :electionId route)
router.get(
  "/elections/active/stats",
  authenticateToken,
  getActiveElectionStats
);

// Get stats for a specific election (keep this last to avoid conflicts)
router.get("/elections/:electionId/stats", authenticateToken, getElectionStats);

// Get general system stats
router.get("/", authenticateToken, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'voter') as total_voters,
        (SELECT COUNT(*) FROM votes) as total_votes,
        (SELECT COUNT(*) FROM candidates) as total_candidates,
        (SELECT COUNT(*) FROM elections WHERE isactive = true) as active_elections
    `);
    res.json(stats.rows[0]);
  } catch (error) {
    console.error("Error fetching general stats:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
