import express from 'express';
import { pool } from '../dbConfig.js';
import { authenticateToken, adminOnly } from '../middlewares/authMiddleware.js';
import {
  recordVote, getVotes, getUserVotes, getUserParticipation, deleteInactiveVoters, requestVoteOTP,
} from '../controllers/votesController.js';

const router = express.Router();

router.post('/request-otp', authenticateToken, requestVoteOTP);

// Get all voters (admin only)
router.get('/', authenticateToken, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, matric_number, staff_id, role, created_at FROM users WHERE role = $1 ORDER BY created_at DESC',
      ['voter']
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching voters:', error.message);
    res.status(500).json({ message: 'Failed to fetch voters.' });
  }
});

// Verify voter (admin only)
router.put('/:id/verify', authenticateToken, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE users SET is_verified = true WHERE id = $1 AND role = $2 RETURNING id, name, email',
      [req.params.id, 'voter']
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Voter not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error verifying voter:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get vote counts
router.get('/counts', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM votecounts');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cast vote
router.post('/vote', authenticateToken, recordVote);
router.post('/votes', authenticateToken, recordVote);

// Get all votes
router.get('/votes', authenticateToken, getVotes);

// Get user participation history (ballot-secret)
router.get('/participation', authenticateToken, getUserParticipation);

// Get user-specific votes by userId
router.get('/votes/user/:userId', authenticateToken, getUserVotes);

// Delete inactive voters
router.delete('/inactive', authenticateToken, adminOnly, deleteInactiveVoters);

export default router;
