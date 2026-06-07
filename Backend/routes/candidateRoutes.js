import express from "express";
import {
  getCandidates,
  addCandidate,
  updateCandidate,
  deleteCandidate,
  uploadCandidatePicture,
  fetchCandidatesByElection,
} from "../controllers/candidateController.js";

const router = express.Router();

// Fetch all candidates
router.get("/", getCandidates);

// Add a new candidate (with picture upload)
router.post("/", uploadCandidatePicture, addCandidate);

// Update a candidate (with optional new picture)
router.put("/:candidateId", uploadCandidatePicture, updateCandidate);

// Delete a candidate
router.delete("/:candidateId", deleteCandidate);

// Fetch candidates for a specific election — must come LAST
// so /:candidateId routes above match first
router.get("/:electionId", fetchCandidatesByElection);

export default router;
