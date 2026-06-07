// candidateController.js
import path from "path";
import multer from "multer";
import fs from "fs";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import { pool } from "../dbConfig.js";
import { uploadToSupabase } from "../utils/supabaseService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer configuration for file uploads using memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max size
  fileFilter: (req, file, cb) => {
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if ([".jpg", ".jpeg", ".png"].includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPG, JPEG, PNG) are allowed!"));
    }
  },
});

export const uploadCandidatePicture = upload.single("picture");

// Fetch all candidates
export const getCandidates = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT c.*, e.title AS election FROM candidates c INNER JOIN elections e ON c.electionid = e.electionid"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add candidate
export const addCandidate = async (req, res) => {
  const picture = req.file;
  const { electionId, name, party = "", matricNumber, position = "", biography = "", manifesto = "" } = req.body;

  if (!picture) {
    return res.status(400).json({ error: "Candidate picture is required." });
  }

  if (!electionId || !name || !matricNumber) {
    return res.status(400).json({ error: "Name, election, and matric number are required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Upload image to Supabase Storage (with local fallback built-in)
    const imageUrl = await uploadToSupabase(
      picture.buffer,
      picture.originalname,
      picture.mimetype,
      "candidates"
    );

    // Check if user with this matric number already exists
    const userQuery = await client.query(
      "SELECT * FROM users WHERE matric_number = $1",
      [matricNumber]
    );

    if (userQuery.rows.length > 0) {
      // User exists, promote their role to 'candidate' and ensure they are verified
      await client.query(
        "UPDATE users SET role = 'candidate', is_verified = true WHERE matric_number = $1",
        [matricNumber]
      );
      console.log(`User with matric number ${matricNumber} promoted to candidate.`);
    } else {
      // User does not exist, create a new user account with role 'candidate'
      const hashedPassword = await bcrypt.hash("Candidate123", 10);
      const tempEmail = `candidate_${matricNumber.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}@acuvote.com`;
      
      await client.query(
        `INSERT INTO users (name, email, password, matric_number, role, display_name, is_verified)
         VALUES ($1, $2, $3, $4, 'candidate', $1, true)`,
        [name, tempEmail, hashedPassword, matricNumber]
      );
      console.log(`Created new candidate user account for matric number ${matricNumber}.`);
    }

    // Insert candidate into candidates table including their matric_number
    await client.query(
      `INSERT INTO candidates (electionid, name, party, image_url, matric_number, position, biography, manifesto)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [electionId, name, party, imageUrl, matricNumber, position, biography, manifesto]
    );

    await client.query("COMMIT");
    res.status(201).json({ message: "Candidate added successfully." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error adding candidate:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
};

// Delete a candidate
export const deleteCandidate = async (req, res) => {
  const { candidateId } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM candidates WHERE candidateid = $1 RETURNING *",
      [candidateId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Candidate not found." });
    }

    // Delete candidate image from the server
    const candidate = result.rows[0];
    const filePath = path.join(process.cwd(), candidate.image_url);
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) console.error("Error deleting file:", err);
      });
    }

    res.status(200).json({ message: "Candidate deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};
// Fetch candidates by election
export const fetchCandidatesByElection = async (req, res) => {
  const { electionId } = req.params;
  try {
    const result = await pool.query(
      `SELECT candidateid, electionid, name, party, image_url, vote_count,
              matric_number, position, biography, manifesto, created_at
       FROM candidates WHERE electionid = $1 ORDER BY candidateid ASC`,
      [electionId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Update candidate details
export const updateCandidate = async (req, res) => {
  const { candidateId } = req.params;
  // req.body is populated by multer (form sends multipart/form-data)
  const { name, party = "", position = "", biography = "", manifesto = "" } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name field is required." });
  }

  try {
    let imageUrl = null;

    // If a new picture was uploaded, push it to Supabase
    if (req.file) {
      imageUrl = await uploadToSupabase(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        "candidates"
      );
    }

    // Build the update query — only update image_url if a new file was provided
    const result = await pool.query(
      `UPDATE candidates
       SET name = $1,
           party = $2,
           position = $3,
           biography = $4,
           manifesto = $5
           ${imageUrl ? ", image_url = $6" : ""}
       WHERE candidateid = ${imageUrl ? "$7" : "$6"}
       RETURNING *`,
      imageUrl
        ? [name, party, position, biography, manifesto, imageUrl, candidateId]
        : [name, party, position, biography, manifesto, candidateId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Candidate not found." });
    }

    res.status(200).json({
      message: "Candidate updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating candidate:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
