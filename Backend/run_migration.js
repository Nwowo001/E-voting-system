import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './dbConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  try {
    const migrationPath = path.join(__dirname, 'migration.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log("Executing database migration SQL...");
    await pool.query(sql);
    console.log("Migration executed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

migrate();
