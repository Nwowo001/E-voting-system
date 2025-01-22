// statsRoute.js
import express from "express";
import { pool } from "../dbConfig.js";

import { authenticateToken } from "../middlewares/authMiddleware.js";
const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'voter') as total_voters,
        (SELECT COUNT(*) FROM elections WHERE NOW() BETWEEN start_date AND end_date) as active_elections,
        (SELECT COUNT(*) FROM votes) as total_votes,
        (SELECT COUNT(DISTINCT party) FROM candidates) as registered_parties
    `);

    res.json(stats.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
