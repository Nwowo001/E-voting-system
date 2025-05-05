// electionModel.js
import { pool } from "../dbConfig.js";

export const getAllElections = async () => {
  try {
    return await pool.query("SELECT * FROM elections ORDER BY start_date DESC");
  } catch (error) {
    console.error("Database error fetching elections:", error.message);
    throw error;
  }
};

export const createElection = async (
  title,
  description,
  start_date,
  end_date,
  start_time,
  end_time
) => {
  try {
    return await pool.query(
      `
      INSERT INTO elections (title, description, start_date, end_date, start_time, end_time)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [title, description, start_date, end_date, start_time, end_time]
    );
  } catch (error) {
    console.error("Database error creating election:", error.message);
    throw error;
  }
};

export const getElectionResults = async (electionId) => {
  try {
    return await pool.query(
      `
      SELECT c.name AS candidate_name, c.vote_count
      FROM candidates c
      WHERE c.electionid = $1
      ORDER BY c.vote_count DESC
      `,
      [electionId]
    );
  } catch (error) {
    console.error("Database error fetching election results:", error.message);
    throw error;
  }
};
