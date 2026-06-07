import express from "express";
import { authenticateToken, adminOnly } from "../middlewares/authMiddleware.js";
import {
  createElection,
  fetchElections,
  updateElection,
  deleteElection,
  fetchElectionResults,
  getElectionTimeRemaining,
} from "../controllers/electionController.js";
import {
  getCandidates,
  addCandidate,
  fetchCandidatesByElection,
  updateCandidate,
  deleteCandidate,
  uploadCandidatePicture,
} from "../controllers/candidateController.js";
import {
  getUserVotes,
  recordVote,
  getVotes,
} from "../controllers/votesController.js";
import { getAuditLogs } from "../controllers/auditController.js";
import { pool } from "../dbConfig.js";
import {
  logout,
  createStaffUser,
  changePassword,
} from "../controllers/userController.js";

const router = express.Router();

// Election Management
router.get("/elections/:electionId/time-remaining", getElectionTimeRemaining);
router.post("/elections", authenticateToken, adminOnly, createElection);
router.get("/elections", authenticateToken, fetchElections);
router.put("/elections/:id", authenticateToken, adminOnly, updateElection);
router.delete("/elections/:id", authenticateToken, adminOnly, deleteElection);
router.get(
  "/elections/:id/results",
  authenticateToken,
  adminOnly,
  fetchElectionResults,
);
router.put(
  "/elections/:id/activate",
  authenticateToken,
  adminOnly,
  async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        "UPDATE elections SET isactive = true WHERE electionid = $1 RETURNING *",
        [id],
      );
      if (result.rows.length === 0)
        return res.status(404).json({ error: "Election not found" });
      if (req.io) req.io.emit("election_updated", result.rows[0]);
      res.status(200).json({ success: true, election: result.rows[0] });
    } catch (error) {
      console.error("Error activating election:", error.message);
      res.status(500).json({ error: "Failed to activate election" });
    }
  },
);

// Candidate Management
router.get("/candidates", getCandidates);
router.get("/candidates/:electionId", fetchCandidatesByElection);
router.post(
  "/candidates",
  authenticateToken,
  adminOnly,
  uploadCandidatePicture,
  addCandidate,
);
router.put(
  "/candidates/:candidateId",
  authenticateToken,
  adminOnly,
  updateCandidate,
);
router.delete(
  "/candidates/:candidateId",
  authenticateToken,
  adminOnly,
  deleteCandidate,
);

// Voter and Vote Management
router.get("/votes", authenticateToken, adminOnly, getVotes);
router.get("/votes/user/:userId", authenticateToken, adminOnly, getUserVotes);

// Admin creates staff/admin user
router.post("/create-user", authenticateToken, adminOnly, createStaffUser);

// Dashboard Stats
router.get(
  "/dashboard-stats",
  authenticateToken,
  adminOnly,
  async (req, res) => {
    try {
      const [votersRes, electionsRes, votesRes] = await Promise.all([
        pool.query("SELECT COUNT(*) FROM users WHERE role = 'voter'"),
        pool.query(
          "SELECT COUNT(*) FILTER (WHERE isactive = true) as active, COUNT(*) as total FROM elections",
        ),
        pool.query("SELECT COUNT(*) FROM votes"),
      ]);
      res.json({
        totalVoters: parseInt(votersRes.rows[0].count),
        activeElections: parseInt(electionsRes.rows[0].active),
        totalElections: parseInt(electionsRes.rows[0].total),
        totalVotes: parseInt(votesRes.rows[0].count),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.post("/logout", logout);

// Authenticated User Info
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const userQuery = await pool.query(
      "SELECT id, name, email, matric_number, staff_id, role, display_name, profile_image, phone, bio, is_verified, created_at FROM users WHERE id = $1",
      [req.user.id],
    );
    if (userQuery.rows.length === 0)
      return res.status(404).json({ message: "User not found" });
    const userData = userQuery.rows[0];
    res.json(userData);
  } catch (error) {
    console.error("Session fetch error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/change-password", authenticateToken, changePassword);

export default router;
