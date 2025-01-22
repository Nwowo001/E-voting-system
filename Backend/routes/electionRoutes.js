// electionRoutes.js
import express from "express";
import {
  addElection,
  fetchElections,
  fetchElectionResults,
  voteForCandidate,
} from "../controllers/electionController.js";
const router = express.Router();
router.post("/vote", voteForCandidate);
router.post("/", addElection); // Add an election
router.get("/", fetchElections); // Get all elections
router.get("/results/:electionId", fetchElectionResults); // Get results for an election

export default router;
