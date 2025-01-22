// electionModel.js
import { pool } from "../dbConfig.js";

export const getAllElections = () => {
  return pool.query("SELECT * FROM elections ORDER BY start_date DESC");
};

export const createElection = async (title, description, start_Date, endDate) => {
  try {
    return await pool.query(
      "INSERT INTO elections (title, description, start_date, enddate) VALUES ($1, $2, $3, $4) RETURNING *",
      [title, description, start_Date, endDate]
    );
  } catch (err) {
    console.error("Database error creating election:", err);
    throw err;
  }


export const getElectionResults = (electionId) => {
  return pool.query(
    `
    SELECT c.*, COUNT(v.id) as vote_count 
    FROM candidates c 
    LEFT JOIN votes v ON c.id = v.candidateid 
    WHERE c.electionid = $1 
    GROUP BY c.id`,
    [electionId]
  );
};
