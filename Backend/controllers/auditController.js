// auditController.js
import { pool } from "../dbConfig.js";

export const getAuditLogs = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM audits");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
