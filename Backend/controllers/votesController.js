// votesController.js
import { pool } from "../dbConfig.js";

export const recordVote = async (req, res) => {
  const client = await pool.connect();

  try {
    await pool.query("BEGIN");
    const { candidateId, electionId, voterId } = req.body;

    // Check if election is active
    const electionStatus = await client.query(
      `SELECT * FROM elections 
       WHERE electionid = $1 
       AND NOW() BETWEEN start_date AND end_date`,
      [electionId]
    );

    if (electionStatus.rows.length === 0) {
      throw new Error("Election is not active");
    }

    // Check if voter has already voted in this election
    const voteCheck = await pool.query(
      "SELECT * FROM votes WHERE voterid = $1 AND electionid = $2",
      [voterId, electionId]
    );

    if (voteCheck.rows.length > 0) {
      await pool.query("ROLLBACK");
      return res.status(400).json({ error: "Already voted in this election" });
    }

    // Record vote with additional validation
    const result = await client.query(
      `INSERT INTO votes (candidateid, electionid, voterid, timestamp)
       VALUES ($1, $2, $3, NOW())
       RETURNING id`,
      [candidateId, electionId, voterId]
    );

    // Update candidate vote count
    await pool.query(
      "UPDATE candidates SET vote_count = vote_count + 1 WHERE id = $1",
      [candidateId]
    );

    await client.query("COMMIT");

    // Emit real-time update
    io.emit("vote_recorded", {
      electionId,
      candidateId,
    });

    return res.status(201).json({
      success: true,
      message: "Vote recorded successfully",
      data: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Failed to record vote" });
  } finally {
    client.release();
  }
};
export const getVotes = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM votes");
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: err.message });
  }
};

export const castVote = async (req, res) => {
  const { electionId, voterId, candidateId } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO votes (electionid, voterid, candidateid) VALUES ($1, $2, $3) RETURNING *",
      [electionId, voterId, candidateId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
