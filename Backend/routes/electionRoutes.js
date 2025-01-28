import express from "express";
import {
  addElection,
  fetchElections,
  fetchElectionResults,
  voteForCandidate,
  deleteElection,
  updateElection,
  toggleElectionStatus,
} from "../controllers/electionController.js";
import { authenticateToken, adminOnly } from "../middlewares/authMiddleware.js";
const router = express.Router();

router.post("/", addElection); // Add an election
router.get("/", fetchElections); // Fetch all elections
router.get("/results/:electionId", fetchElectionResults); // Fetch results for an election
router.post("/vote", voteForCandidate); // Record a vote for a candidate
router.delete("/:electionId", deleteElection); // Delete an election
router.put("/:electionId", updateElection); // Update an election
router.put("/:electionId/status", toggleElectionStatus);
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

      io.emit("election_updated", result.rows[0]); // Notify clients via Socket.IO

      res.status(200).json({ success: true, election: result.rows[0] });
    } catch (error) {
      console.error("Error activating election:", error.message);
      res.status(500).json({ error: "Failed to activate election" });
    }
  }
);

export default router;
