import { pool } from '../dbConfig.js';
import { sendOTPEmail } from '../utils/emailService.js';

// Helper to generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const requestVoteOTP = async (req, res) => {
  const { electionid } = req.body;
  const userid = req.user.id;

  if (!electionid) {
    return res.status(400).json({ error: 'Election ID is required.' });
  }

  try {
    // Get user email and role
    const userQuery = await pool.query('SELECT email, role FROM users WHERE id = $1', [userid]);
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const { email, role } = userQuery.rows[0];
    
    if (role === 'candidate') {
      return res.status(403).json({ error: 'Candidates are not eligible to vote.' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Please update your email address in settings before voting.' });
    }

    // Check election exists and is within its time window.
    // We do this check in PostgreSQL using explicit timezone conversion:
    // stored DATE+TIME is treated as Africa/Lagos (WAT = UTC+1) and compared
    // against NOW() (TIMESTAMPTZ). This avoids Node.js process timezone issues
    // where new Date("HH:MM:SS") may be parsed as UTC instead of local time.
    const electionStatus = await pool.query(
      `SELECT *,
        NOW() >= ((start_date::text || ' ' || start_time::text)::timestamp AT TIME ZONE 'Africa/Lagos')
        AND
        NOW() <= ((end_date::text || ' ' || end_time::text)::timestamp AT TIME ZONE 'Africa/Lagos')
        AS in_window
       FROM elections WHERE electionid = $1`,
      [electionid]
    );
    if (electionStatus.rows.length === 0) {
      return res.status(400).json({ error: 'Election not found.' });
    }
    if (!electionStatus.rows[0].in_window) {
      return res.status(400).json({ error: 'Election voting window is closed.' });
    }

    // Check if already voted
    const voterCheck = await pool.query(
      'SELECT * FROM voters WHERE userid = $1 AND electionid = $2',
      [userid, electionid]
    );
    if (voterCheck.rows.length > 0 && voterCheck.rows[0].has_voted) {
      return res.status(400).json({ error: 'Already voted in this election.' });
    }

    // Save generated OTP
    const otp = generateOTP();
    await pool.query('DELETE FROM otps WHERE email = $1 AND type = \'vote\'', [email]);
    await pool.query(
      `INSERT INTO otps (email, code, expires_at, type) 
       VALUES ($1, $2, NOW() + INTERVAL '15 minutes', 'vote')`,
      [email, otp]
    );

    // Send OTP
    await sendOTPEmail(email, otp, 'vote');

    res.status(200).json({ message: 'Voting verification code has been sent to your email.' });
  } catch (error) {
    console.error('Request vote OTP error:', error.message);
    res.status(500).json({ error: 'Failed to request code.' });
  }
};

export const recordVote = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { candidateid, electionid, otp } = req.body;
    const voterid = req.user.id;

    if (!otp) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Verification code is required.' });
    }

    // Get user email and role
    const userQuery = await client.query('SELECT email, role FROM users WHERE id = $1', [voterid]);
    if (userQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found.' });
    }
    const { email, role } = userQuery.rows[0];

    if (role === 'candidate') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Candidates are restricted from casting votes.' });
    }

    // Verify OTP
    const otpQuery = await client.query(
      `SELECT * FROM otps 
       WHERE email = $1 AND code = $2 AND type = 'vote' AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, otp]
    );

    if (otpQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid or expired voting verification code.' });
    }

    // Check election exists and is within its time window.
    // PostgreSQL AT TIME ZONE avoids Node.js UTC vs UTC+1 timezone issues.
    const electionStatus = await client.query(
      `SELECT *,
        NOW() >= ((start_date::text || ' ' || start_time::text)::timestamp AT TIME ZONE 'Africa/Lagos')
        AND
        NOW() <= ((end_date::text || ' ' || end_time::text)::timestamp AT TIME ZONE 'Africa/Lagos')
        AS in_window
       FROM elections WHERE electionid = $1`,
      [electionid]
    );
    if (electionStatus.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Election not found' });
    }
    if (!electionStatus.rows[0].in_window) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Election voting window is closed' });
    }

    // Check if voter has already voted using voters table (for ballot secrecy)
    const voterCheck = await client.query(
      'SELECT * FROM voters WHERE userid = $1 AND electionid = $2',
      [voterid, electionid]
    );
    if (voterCheck.rows.length > 0 && voterCheck.rows[0].has_voted) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Already voted in this election' });
    }

    // Mark voter as having voted (for anonymity tracking)
    await client.query(
      `INSERT INTO voters (userid, electionid, has_voted)
       VALUES ($1, $2, true)`,
      [voterid, electionid]
    );

    // Record the vote anonymously (without voterid for ballot secrecy)
    const result = await client.query(
      `INSERT INTO votes (candidateid, electionid, votetimestamp)
       VALUES ($1, $2, NOW())
       RETURNING voteid`,
      [candidateid, electionid]
    );

    // Update votecounts table
    await client.query(
      'UPDATE votecounts SET votecount = votecount + 1 WHERE candidateid = $1',
      [candidateid]
    );
    // Also update candidates table vote_count
    await client.query(
      'UPDATE candidates SET vote_count = vote_count + 1 WHERE candidateid = $1',
      [candidateid]
    );

    // Delete OTP
    await client.query('DELETE FROM otps WHERE email = $1 AND type = \'vote\'', [email]);

    await client.query('COMMIT');

    // Emit real-time update
    if (req.io) {
      req.io.emit('vote_recorded', { electionid, candidateid });
    }

    return res.status(201).json({
      success: true,
      message: 'Vote recorded successfully',
      data: result.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error recording vote:', error.message);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Already voted in this election' });
    }
    res.status(500).json({ error: 'Failed to record vote' });
  } finally {
    client.release();
  }
};

export const getVotes = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM votes');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching votes:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export const getUserParticipation = async (req, res) => {
  const userId = req.user.id;
  try {
    // Return elections the user participated in (NOT who they voted for - ballot secrecy)
    const result = await pool.query(
      `SELECT v.electionid, v.has_voted, v.voterid as voterid_serial,
              e.title,
              TO_CHAR(e.start_date, 'YYYY-MM-DD') AS start_date,
              TO_CHAR(e.end_date, 'YYYY-MM-DD') AS end_date,
              e.isactive
       FROM voters v
       JOIN elections e ON v.electionid = e.electionid
       WHERE v.userid = $1
       ORDER BY e.start_date DESC`,
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching user participation:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export const getUserVotes = async (req, res) => {
  // Return empty array to maintain ballot secrecy (user votes cannot be queried by id)
  res.status(200).json([]);
};

export const deleteInactiveVoters = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inactiveVoters = await client.query(`
      WITH voter_participation AS (
        SELECT u.id,
               COUNT(DISTINCT e.electionid) as total_elections,
               COUNT(DISTINCT v.electionid) as participated_elections
        FROM users u
        CROSS JOIN elections e
        LEFT JOIN voters v ON u.id = v.userid AND e.electionid = v.electionid
        WHERE u.role = 'voter'
        GROUP BY u.id
        HAVING (COUNT(DISTINCT e.electionid) - COUNT(DISTINCT v.electionid)) >= 3
      )
      DELETE FROM users WHERE id IN (SELECT id FROM voter_participation) AND role = 'voter' RETURNING id, email
    `);
    await client.query('COMMIT');
    res.status(200).json({
      success: true,
      message: `Successfully deleted ${inactiveVoters.rows.length} inactive voters`,
      deletedVoters: inactiveVoters.rows,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting inactive voters:', error.message);
    res.status(500).json({ error: 'Failed to delete inactive voters' });
  } finally {
    client.release();
  }
};
