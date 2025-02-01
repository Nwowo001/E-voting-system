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

export const getAllElectionsStats = async (req, res) => {
  try {
    const query = `
      SELECT 
        e.electionid,
        e.title,
        e.description,
        e.start_date,
        e.end_date,
        e.isactive,
        COUNT(DISTINCT v.voteid) as total_votes,
        COUNT(DISTINCT c.candidateid) as candidate_count
      FROM elections e
      LEFT JOIN candidates c ON e.electionid = c.electionid
      LEFT JOIN votes v ON c.candidateid = v.candidateid
      GROUP BY e.electionid, e.title, e.description, e.start_date, e.end_date, e.isactive
      ORDER BY e.start_date DESC`;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching all elections stats:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getElectionStats = async (req, res) => {
  const { electionId } = req.params;

  // Validate that electionId is a number
  if (!Number.isInteger(parseInt(electionId))) {
    return res.status(400).json({ error: "Invalid election ID format" });
  }

  try {
    const electionQuery = `
      WITH VoterCount AS (
        SELECT COUNT(*) as total_voters 
        FROM users 
        WHERE role = 'voter'
      ),
      VoteCounts AS (
        SELECT 
          c.candidateid,
          c.name,
          c.party,
          COUNT(v.voteid) as vote_count
        FROM candidates c
        LEFT JOIN votes v ON c.candidateid = v.candidateid
        WHERE c.electionid = $1
        GROUP BY c.candidateid, c.name, c.party
      ),
      TotalVotes AS (
        SELECT COUNT(DISTINCT voteid) as total_votes
        FROM votes v
        JOIN candidates c ON v.candidateid = c.candidateid
        WHERE c.electionid = $1
      )
      SELECT 
        e.title,
        e.description,
        vc.total_voters,
        COALESCE(tv.total_votes, 0) as total_votes,
        CASE 
          WHEN vc.total_voters > 0 THEN
            ROUND(CAST((COALESCE(tv.total_votes, 0)::float / vc.total_voters * 100) AS numeric), 2)
          ELSE 0
        END as voter_turnout,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'name', vc2.name,
                'voteCount', vc2.vote_count,
                'party', vc2.party
              )
            )
            FROM VoteCounts vc2
          ),
          '[]'::json
        ) as candidates
      FROM elections e
      CROSS JOIN VoterCount vc
      LEFT JOIN TotalVotes tv ON true
      WHERE e.electionid = $1
      GROUP BY e.electionid, e.title, e.description, vc.total_voters, tv.total_votes`;

    const result = await pool.query(electionQuery, [electionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Election not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching election stats:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getActiveElectionStats = async (req, res) => {
  try {
    const query = `
      WITH VoterCount AS (
        SELECT COUNT(*) as total_voters 
        FROM users 
        WHERE role = 'voter'
      ),
      VoteCounts AS (
        SELECT 
          e.electionid,
          c.candidateid,
          c.name,
          c.party,
          COUNT(v.voteid) as vote_count
        FROM elections e
        JOIN candidates c ON e.electionid = c.electionid
        LEFT JOIN votes v ON c.candidateid = v.candidateid
        WHERE e.isactive = true
        GROUP BY e.electionid, c.candidateid, c.name, c.party
      ),
      TotalVotes AS (
        SELECT 
          e.electionid,
          COUNT(DISTINCT v.voteid) as total_votes,
          COUNT(DISTINCT c.candidateid) as candidate_count
        FROM elections e
        LEFT JOIN candidates c ON e.electionid = c.electionid
        LEFT JOIN votes v ON c.candidateid = v.candidateid
        WHERE e.isactive = true
        GROUP BY e.electionid
      )
      SELECT 
        e.electionid,
        e.title,
        COALESCE(tv.total_votes, 0) as total_votes,
        COALESCE(tv.candidate_count, 0) as candidate_count,
        CASE 
          WHEN vc.total_voters > 0 THEN
            ROUND(CAST((COALESCE(tv.total_votes, 0)::float / vc.total_voters * 100) AS numeric), 2)
          ELSE 0
        END as voter_turnout,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'name', vc2.name,
                'voteCount', vc2.vote_count,
                'party', vc2.party
              )
            )
            FROM VoteCounts vc2
            WHERE vc2.electionid = e.electionid
          ),
          '[]'::json
        ) as candidates
      FROM elections e
      CROSS JOIN VoterCount vc
      LEFT JOIN TotalVotes tv ON e.electionid = tv.electionid
      WHERE e.isactive = true`;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Error in getActiveElectionStats:", error);
    res.status(500).json({ error: error.message });
  }
};
