import express from "express";
import { authenticateToken, adminOnly } from "../middlewares/authMiddleware.js";
import {
  createElection,
  fetchElections,
  updateElection,
  deleteElection,
  fetchElectionResults,
} from "../controllers/electionController.js";
import {
  getCandidates,
  addCandidate,
  fetchCandidatesByElection,
  updateCandidate,
  deleteCandidate,
} from "../controllers/candidateController.js";
import { recordVote, getVotes } from "../controllers/votesController.js";
import { getAuditLogs } from "../controllers/auditController.js";
import { getVoteCounts } from "../controllers/statsController.js";

const router = express.Router();

// Election Management
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

// Candidate Management
router.get("/candidates", getCandidates); // Accessible by all
router.get("/candidates/:electionId", fetchCandidatesByElection); // Public route for election candidates
router.post("/candidates", authenticateToken, adminOnly, addCandidate);
router.put("/candidates/:id", authenticateToken, adminOnly, updateCandidate);
router.delete("/candidates/:id", authenticateToken, adminOnly, deleteCandidate);

// Voter and Vote Management
router.get("/votes", authenticateToken, adminOnly, getVotes); // Admin can view votes for transparency
router.post("/votes", authenticateToken, recordVote); // Voters record their own votes

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
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  res.json(user);
});

export default router;
