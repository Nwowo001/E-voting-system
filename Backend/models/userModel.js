// userModel.js
import { pool } from "../dbConfig.js";

export const getAllUsers = async () => {
  return await pool.query(
    "SELECT id, name, email, role, matric_number, staff_id, display_name, profile_image, created_at FROM users ORDER BY created_at DESC"
  );
};

export const createUsers = async (name, email, hashedPassword, matric_number) => {
  return await pool.query(
    "INSERT INTO users (name, email, password, matric_number, role, display_name) VALUES ($1, $2, $3, $4, 'voter', $1) RETURNING id, name, email, role, matric_number",
    [name, email || null, hashedPassword, matric_number]
  );
};
