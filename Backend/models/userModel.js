// userModel.js
import { pool } from "../dbConfig.js";

export const getAllUsers = async () => {
  return await pool.query("SELECT * FROM elections");
};

export const createUsers = async (title, description, startDate, endDate) => {
  return await pool.query(
    "INSERT INTO elections (title, description, start_date, end_date) VALUES ($1, $2, $3, $4)",
    [title, description, startDate, endDate]
  );
};
