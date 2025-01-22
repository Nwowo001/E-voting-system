// electionController.js
import { pool } from "../dbConfig.js";

export const voteForCandidate = (req, res) => {
  const { candidateId } = req.body;

  Candidate.findByIdAndUpdate(candidateId, { $inc: { voteCount: 1 } })
    .then(() => res.json({ message: "Vote recorded" }))
    .catch((err) => res.status(500).json({ error: err.message }));
};

export const fetchElections = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM elections");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching elections:", error.message);
    res.status(500).json({ message: "Failed to fetch elections." });
  }
};

export const addElection = async (req, res) => {
  const { title, description, start_Date, endDate } = req.body;

  if (!title || !description || !start_Date || !endDate) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    await createElectionModel(title, description, start_Date, endDate);
    res.status(201).json({ message: "Election created successfully." });
  } catch (error) {
    console.error("Error creating election:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const createElection = async (req, res) => {
  const { electionName, startDate, endDate, title, description } = req.body;

  try {
    const result = await pool.query(
      "INSERT INTO elections (electionname, start_date, enddate, title, description) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [electionName, start_Date, endDate, title, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const fetchElectionResults = async (req, res) => {
  const { electionId } = req.params;

  try {
    const result = await pool.query(
      `SELECT c.name, vc.vote_count 
       FROM candidates c 
       INNER JOIN votecounts vc 
       ON c.id = vc.candidateid 
       WHERE c.electionid = $1`,
      [electionId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching election results:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
export const deleteElection = async (req, res) => {
  const { electionId } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM elections WHERE id = $1 RETURNING *",
      [electionId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Election not found" });
    }

    res
      .status(200)
      .json({ message: "Election deleted successfully", data: result.rows[0] });
  } catch (error) {
    console.error("Error deleting election:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
export const updateElection = async (req, res) => {
  const { electionId } = req.params;
  const { title, description, start_Date, endDate } = req.body;

  if (!title || !description || !start_Date || !endDate) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const result = await pool.query(
      `UPDATE elections
       SET title = $1, description = $2, start_date = $3, enddate = $4
       WHERE electionid = $5
       RETURNING *`,
      [title, description, startDate, endDate, electionId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Election not found." });
    }

    res.status(200).json({
      message: "Election updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating election:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
