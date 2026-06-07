import express from "express";
import {
  addElection,
  fetchElections,
  fetchElectionResults,
  voteForCandidate,
  deleteElection,
  updateElection,
  toggleElectionStatus,
  getAllElections,
} from "../controllers/electionController.js";
import { authenticateToken, adminOnly } from "../middlewares/authMiddleware.js";
import { pool } from "../dbConfig.js";
const router = express.Router();

router.post("/", addElection);                                    // Create election
router.get("/", fetchElections);                                   // Fetch all elections
router.get("/all", getAllElections);                               // Fetch all (alt)
router.get("/results/:electionId", fetchElectionResults);         // Election results
router.post("/vote", voteForCandidate);                           // Record a vote
router.delete("/:electionId", deleteElection);                    // Delete election
router.put("/:electionId", updateElection);                       // Update election
router.put("/:electionId/status", toggleElectionStatus);          // Toggle status

// Activate / deactivate an election — called by admin's handleToggleStatus
// Full path: PUT /api/elections/:electionId/activate
router.put(
  "/:electionId/activate",
  authenticateToken,
  adminOnly,
  async (req, res) => {
    try {
      const { electionId } = req.params;
      const { isactive } = req.body;

      const result = await pool.query(
        "UPDATE elections SET isactive = $1 WHERE electionid = $2 RETURNING *",
        [isactive, electionId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Election not found" });
      }

      // Notify all connected clients via Socket.IO
      req.io.emit("election_updated", result.rows[0]);

      res.status(200).json({ success: true, election: result.rows[0] });
    } catch (error) {
      console.error("Error toggling election status:", error.message);
      res.status(500).json({ error: "Failed to update election status" });
    }
  }
);

export default router;
