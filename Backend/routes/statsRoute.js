import express from "express";
import { pool } from "../dbConfig.js";
import {
  getElectionStats,
  getActiveElectionStats,
  getAllElectionsStats,
} from "../controllers/statsController.js";
import { authenticateToken, adminOnly } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Important: Order matters! Put more specific routes first
// Get stats for all elections (must come before :electionId route)
router.get("/elections/all/stats", authenticateToken, adminOnly, getAllElectionsStats);

// Get stats for active elections (must come before :electionId route)
router.get(
  "/elections/active/stats",
  authenticateToken,
  adminOnly,
  getActiveElectionStats
);

// Get stats for a specific election (keep this last to avoid conflicts)
router.get("/elections/:electionId/stats", authenticateToken, adminOnly, getElectionStats);

// ─── Candidate stats ──────────────────────────────────────────────────────────
// Get live standing for a single candidate: vote count, %, ranking
router.get("/candidates/:candidateId", authenticateToken, adminOnly, async (req, res) => {
  const { candidateId } = req.params;
  try {
    const result = await pool.query(
      `WITH ElectionVotes AS (
         -- All candidates in the same election with their vote counts
         SELECT
           c.candidateid,
           COUNT(v.voteid) AS vote_count
         FROM candidates c
         LEFT JOIN votes v ON c.candidateid = v.candidateid
         WHERE c.electionid = (
           SELECT electionid FROM candidates WHERE candidateid = $1
         )
         GROUP BY c.candidateid
       ),
       Ranked AS (
         SELECT
           candidateid,
           vote_count,
           RANK() OVER (ORDER BY vote_count DESC) AS ranking
         FROM ElectionVotes
       ),
       TotalVotes AS (
         SELECT COALESCE(SUM(vote_count), 0) AS total FROM ElectionVotes
       )
       SELECT
         r.vote_count                                          AS "voteCount",
         CASE
           WHEN t.total > 0
           THEN ROUND((r.vote_count::numeric / t.total * 100), 1)
           ELSE 0
         END                                                   AS "votePercentage",
         r.ranking
       FROM Ranked r
       CROSS JOIN TotalVotes t
       WHERE r.candidateid = $1`,
      [candidateId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Candidate not found." });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching candidate stats:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get general system stats
router.get("/", authenticateToken, adminOnly, async (req, res) => {
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
