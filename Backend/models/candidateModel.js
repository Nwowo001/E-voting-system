// candidateModel.js
import { pool } from "../dbConfig.js";
export const getAllCandidates = () => {
  return pool.query("SELECT * FROM candidates");
};

export const getCandidatesByElection = (electionId) => {
  return pool.query("SELECT * FROM candidates WHERE election_id = $1", [
    electionId,
  ]);
};

export const createCandidate = (name, party, electionId, imageUrl) => {
  return pool.query(
    "INSERT INTO candidates (name, party, election_id, image_url) VALUES ($1, $2, $3, $4) RETURNING *",
    [name, party, electionId, imageUrl]
  );
};
