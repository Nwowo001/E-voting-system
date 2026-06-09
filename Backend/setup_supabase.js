import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./dbConfig.js";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupSupabase() {
  try {
    console.log("Reading database creation and migration files...");
    const schemaPath = path.join(__dirname, "Database Schema");
    const migrationPath = path.join(__dirname, "migration.sql");

    const schemaSql = fs.readFileSync(schemaPath, "utf8");
    const migrationSql = fs.readFileSync(migrationPath, "utf8");

    console.log("Dropping existing tables to reset the database and restart all ID sequences...");
    await pool.query(`
      DROP TABLE IF EXISTS audits CASCADE;
      DROP TABLE IF EXISTS votecounts CASCADE;
      DROP TABLE IF EXISTS votes CASCADE;
      DROP TABLE IF EXISTS voters CASCADE;
      DROP TABLE IF EXISTS candidates CASCADE;
      DROP TABLE IF EXISTS elections CASCADE;
      DROP TABLE IF EXISTS admins CASCADE;
      DROP TABLE IF EXISTS otps CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    console.log("Connecting to Supabase and executing Database Schema creation...");
    await pool.query(schemaSql);
    console.log("Database schema created successfully!");

    console.log("Executing migration.sql adjustments...");
    await pool.query(migrationSql);
    console.log("Migrations applied successfully!");

    console.log("Hashing password for admin user...");
    const hashedPassword = await bcrypt.hash("Admin123", 10);

    console.log("Inserting admin user...");
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, display_name, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, role`,
      ["Administrator", "admin@acuvote.com", hashedPassword, "admin", "Administrator", true]
    );

    console.log("Database setup and seeding completed successfully!");
    console.log("Seeded user:", result.rows[0]);
  } catch (err) {
    console.error("Setup failed:", err.message);
  } finally {
    await pool.end();
  }
}

setupSupabase();
