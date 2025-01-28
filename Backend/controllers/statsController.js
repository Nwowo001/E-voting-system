// statsController.js
import { pool } from "../dbConfig.js";

export const getVoteCounts = async (req, res) => {
  const { electionId } = req.params;

  try {
    const result = await pool.query(
      `SELECT c.name, c.party, COUNT(v.voteid) AS vote_count
       FROM candidates c
       LEFT JOIN votes v ON c.candidateid = v.candidateid
       WHERE c.electionid = $1
       GROUP BY c.candidateid`,
      [electionId]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
