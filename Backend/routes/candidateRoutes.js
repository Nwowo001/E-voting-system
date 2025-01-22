// candidatesRoutes.js
import express from "express";
import {
  fetchCandidatesByElection,
  addCandidate,
  uploadCandidatePicture,
} from "../controllers/candidateController.js";

const router = express.Router();

router.get("/:electionId", fetchCandidatesByElection);
router.post("/", addCandidate, uploadCandidatePicture);

export default router;
