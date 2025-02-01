// votesController.js
import { pool } from "../dbConfig.js";
// import { Socket } from "socket.io";
// import { io } from "../Server.js";
export const recordVote = async (req, res) => {
  const client = await pool.connect();
  const io = req.io;
  try {
    await pool.query("BEGIN");
    const { candidateid, electionid, voterid } = req.body;

    // Check if election is active
    const electionStatus = await client.query(
      `SELECT * FROM elections 
       WHERE electionid = $1 
AND isactive= true`,
      [electionid]
    );

    if (electionStatus.rows.length === 0) {
      throw new Error("Election is not active");
    }
    const { start_date, end_date, start_time, end_time } =
      electionStatus.rows[0];
    const now = new Date();
    const electionStart = new Date(`${start_date}T${start_time}`);
    const electionEnd = new Date(`${end_date}T${end_time}`);

    if (now < electionStart || now > electionEnd) {
      return res.status(400).json({ error: "Election is not active" });
    }

    // Check if voter has already voted in this election
    const voteCheck = await pool.query(
      "SELECT * FROM votes WHERE voterid = $1 AND electionid = $2",
      [voterid, electionid]
    );

    if (voteCheck.rows.length > 0) {
      await pool.query("ROLLBACK");
      return res.status(400).json({ error: "Already voted in this election" });
    }

    // Record vote with additional validation
    const result = await client.query(
      `INSERT INTO votes (candidateid, electionid, voterid, votetimestamp)
       VALUES ($1, $2, $3, NOW())
       RETURNING voteid`,
      [candidateid, electionid, voterid]
    );

    // Update candidate vote count
    await pool.query(
      "UPDATE votecounts SET votecount = votecount + 1 WHERE candidateid = $1",
      [candidateid]
    );

    await client.query("COMMIT");

    // Emit real-time update
    if (req.io) {
      req.io.emit("vote_recorded", {
        electionid,
        candidateid,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Vote recorded successfully",
      data: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error recording vote:", error.message);

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
    console.error("Error fetching votes:", error.message);

    res.status(500).json({ error: err.message });
  }
};

export const castVote = async (req, res) => {
  const { electionid, voterid, candidateid } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO votes (electionid, voterid, candidateid) VALUES ($1, $2, $3) RETURNING *",
      [electionid, voterid, candidateid]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error casting vote:", error.message);

    res.status(500).json({ error: err.message });
  }
};
export const getUserVotes = async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query("SELECT * FROM votes WHERE voterid = $1", [
      userId,
    ]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching user votes:", error.message);

    res.status(500).json({ error: error.message });
  }
};
export const deleteInactiveVoters = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Get voters who missed 3 or more elections
    const inactiveVoters = await client.query(`
      WITH voter_participation AS (
        SELECT 
          u.id,
          COUNT(DISTINCT e.electionid) as total_elections,
          COUNT(DISTINCT v.electionid) as participated_elections
        FROM users u
        CROSS JOIN elections e
        LEFT JOIN votes v ON u.id = v.voterid AND e.electionid = v.electionid
        WHERE u.role = 'voter'
        GROUP BY u.id
        HAVING (COUNT(DISTINCT e.electionid) - COUNT(DISTINCT v.electionid)) >= 3
      )
      DELETE FROM users 
      WHERE id IN (SELECT id FROM voter_participation)
      AND role = 'voter'
      RETURNING id, email
    `);

    await client.query("COMMIT");

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${inactiveVoters.rows.length} inactive voters`,
      deletedVoters: inactiveVoters.rows,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error deleting inactive voters:", error.message);
    res.status(500).json({ error: "Failed to delete inactive voters" });
  } finally {
    client.release();
  }
};
