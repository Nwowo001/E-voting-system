import express from "express";
import {
  getCandidates,
  addCandidate,
  deleteCandidate,
  uploadCandidatePicture,
  fetchCandidatesByElection,
} from "../controllers/candidateController.js";

const router = express.Router();

// Fetch all candidates
router.get("/", getCandidates);

// Add a new candidate (with picture upload)
router.post("/", uploadCandidatePicture, addCandidate);

// Delete a candidate
router.delete("/:candidateId", deleteCandidate);
router.get("/:electionId", fetchCandidatesByElection);

export default router;
