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
} from "../controllers/candidateController.js";
import {
  getUserVotes,
  recordVote,
  getVotes,
} from "../controllers/votesController.js";
import { getAuditLogs } from "../controllers/auditController.js";
import { getVoteCounts } from "../controllers/statsController.js";
import { pool } from "../dbConfig.js";
const router = express.Router();

// Election Management
router.get("/elections/:electionId/time-remaining", getElectionTimeRemaining);

router.post("/elections", authenticateToken, adminOnly, createElection);
router.get("/elections", authenticateToken, adminOnly, fetchElections);
router.put("/elections/:id", authenticateToken, adminOnly, updateElection);
router.delete("/elections/:id", authenticateToken, adminOnly, deleteElection);
router.get(
  "/elections/:id/results",
  authenticateToken,
  adminOnly,
  fetchElectionResults
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
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Election not found" });
      }

      if (global.io) {
        global.io.emit("election_updated", result.rows[0]); // Notify clients via Socket.IO
      }

      res.status(200).json({ success: true, election: result.rows[0] });
    } catch (error) {
      console.error("Error activating election:", error.message);
      res.status(500).json({ error: "Failed to activate election" });
    }
  }
);

// Candidate Management
router.get("/candidates", getCandidates); // Accessible by all
router.get("/candidates/:electionId", fetchCandidatesByElection); // Public route for election candidates
router.post("/candidates", authenticateToken, adminOnly, addCandidate);
router.put("/candidates/:id", authenticateToken, adminOnly, updateCandidate);
router.delete("/candidates/:id", authenticateToken, adminOnly, deleteCandidate);

// Voter and Vote Management
router.get("/votes", authenticateToken, adminOnly, getVotes); // Admin can view votes for transparency
router.get("/votes/user/:userId", getUserVotes);

// Dashboard Stats
router.get("/dashboard-stats", async (req, res) => {
  try {
    const stats = await getVoteCounts();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Authenticated User Info
router.get("/me", authenticateToken, (req, res) => {
  const user = req.user;
  if (!req.session.user) {
    return res.status(404).json({ message: "User not found" });
  }
  res.json(user);
});
router.get("/auth/me", authenticateToken, async (req, res) => {
  try {
    // Since we're using JWT, req.user is already decoded from the token
    const userQuery = await pool.query(
      "SELECT id, name, email, voter_id, role FROM users WHERE id = $1",
      [req.user.id]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return user data without sensitive information
    const userData = userQuery.rows[0];
    res.json({
      id: userData.id,
      name: userData.name,
      email: userData.email,
      voterId: userData.voter_id,
      role: userData.role,
    });
  } catch (error) {
    console.error("Session fetch error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
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
export default router;
