// statsController.js
import { pool } from "../dbConfig.js";

export const getVoteCounts = async (req, res) => {
  const { electionId } = req.params;
  try {
    const result = await pool.query(
      "SELECT candidateid, votecount FROM votecounts WHERE electionid = $1",
      [electionId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
