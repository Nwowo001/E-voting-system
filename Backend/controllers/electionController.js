// electionController.js
import { pool } from "../dbConfig.js";

export const createElection = async (req, res) => {
  const { title, description, start_date, end_date, start_time, end_time } =
    req.body;

  if (
    !title ||
    !description ||
    !start_date ||
    !end_date ||
    !start_time ||
    !end_time
  ) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO elections (title, description, start_date, end_date, start_time, end_time)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [title, description, start_date, end_date, start_time, end_time]
    );
    res.status(201).json({
      message: "Election created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating election:", error.message);
    res.status(500).json({ error: "Internal Server Error." });
  }
};
// Update an existing election
export const updateElection = async (req, res) => {
  const { electionId } = req.params;
  const { title, description, start_date, end_date, start_time, end_time } =
    req.body;

  if (
    !title ||
    !description ||
    !start_date ||
    !end_date ||
    !start_time ||
    !end_time
  ) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const result = await pool.query(
      `
      UPDATE elections
      SET title = $1, description = $2, start_date = $3, end_date = $4, start_time = $5, end_time = $6
      WHERE electionid = $7
      RETURNING *
      `,
      [
        title,
        description,
        start_date,
        end_date,
        start_time,
        end_time,
        electionId,
      ]
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
    res.status(500).json({ error: "Failed to update election." });
  }
};
// Delete an election
export const deleteElection = async (req, res) => {
  const { electionId } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM elections WHERE electionid = $1 RETURNING *",
      [electionId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Election not found." });
    }

    res.status(200).json({
      message: "Election deleted successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting election:", error.message);
    res.status(500).json({ error: "Failed to delete election." });
  }
};

// Toggle active/inactive status
export const toggleElectionStatus = async (req, res) => {
  const { electionId } = req.params;
  const { isActive } = req.body;

  try {
    const result = await pool.query(
      `
      UPDATE elections
      SET isActive = $1
      WHERE electionid = $2
      RETURNING *
      `,
      [isActive, electionId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Election not found." });
    }

    res.status(200).json({
      message: "Election status updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating election status:", error.message);
    res.status(500).json({ error: "Failed to update election status." });
  }
};
export const voteForCandidate = async (req, res) => {
  const { candidateId } = req.body;

  if (!candidateId) {
    return res.status(400).json({ error: "Candidate ID is required." });
  }

  try {
    const result = await pool.query(
      "UPDATE candidates SET vote_count = vote_count + 1 WHERE candidateid = $1 RETURNING *",
      [candidateId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Candidate not found." });
    }

    res.status(200).json({ message: "Vote recorded successfully." });
  } catch (err) {
    console.error("Error recording vote:", err.message);
    res.status(500).json({ error: "Internal Server Error." });
  }
};

export const fetchElections = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM elections ORDER BY start_date DESC"
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching elections:", error.message);
    res.status(500).json({ error: "Failed to fetch elections." });
  }
};

export const addElection = async (req, res) => {
  const { title, description, start_date, end_date, start_time, end_time } =
    req.body;

  // Validate required fields
  if (
    !title ||
    !description ||
    !start_date ||
    !end_date ||
    !start_time ||
    !end_time
  ) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO elections (title, description, start_date, end_date, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, description, start_date, end_date, start_time, end_time]
    );

    res.status(201).json({
      message: "Election created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating election:", error.message);
    res.status(500).json({ error: "Internal Server Error." });
  }
};
export const getAllElections = async (req, res) => {
  try {
    const query = `
      SELECT 
        electionid,
        title,
        description,
        start_date,
        end_date,
        isactive,
        created_at
      FROM elections
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching all elections:", error);
    res.status(500).json({ message: "Failed to fetch elections" });
  }
};

export const fetchElectionResults = async (req, res) => {
  const { electionId } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT 
        c.candidateid,
        c.name AS candidate_name,
        COUNT(v.voteid) AS vote_count
      FROM 
        candidates c
      LEFT JOIN 
        votes v 
      ON 
        c.candidateid = v.candidateid
      WHERE 
        c.electionid = $1
      GROUP BY 
        c.candidateid, c.name
      ORDER BY 
        vote_count DESC;
      `,
      [electionId]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "No results found for this election." });
    }

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching election results:", error.message);
    res.status(500).json({ error: "Internal Server Error." });
  }
};
export const getElectionTimeRemaining = async (req, res) => {
  const { electionId } = req.params;

  try {
    const result = await pool.query(
      "SELECT end_date - NOW() AS time_remaining FROM elections WHERE electionid = $1",
      [electionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Election not found." });
    }

    res.json(result.rows[0].time_remaining);
  } catch (err) {
    console.error("Error fetching election time remaining:", err.message);
    res.status(500).json({ error: "Failed to fetch time remaining." });
  }
};
