import { pool } from "./dbConfig.js";
import bcrypt from "bcryptjs";

async function seedDatabase() {
  try {
    console.log("Truncating all tables and restarting identity sequences...");
    await pool.query(`
      TRUNCATE TABLE audits, votes, voters, votecounts, candidates, elections, admins, users, otps 
      RESTART IDENTITY CASCADE;
    `);

    console.log("Hashing password for admin user...");
    const hashedPassword = await bcrypt.hash("Admin123", 10);

    console.log("Inserting admin user...");
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, display_name, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, role`,
      ["Administrator", "admin@acuvote.com", hashedPassword, "admin", "Administrator", true]
    );

    console.log("Database seeded successfully!");
    console.log("Seeded user:", result.rows[0]);
  } catch (err) {
    console.error("Seeding failed:", err.message);
  } finally {
    await pool.end();
  }
}

seedDatabase();
