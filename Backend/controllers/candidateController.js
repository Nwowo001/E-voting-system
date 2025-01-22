// candidateController.js
import path from "path";
import multer from "multer";
import fs from "fs";
import { fileURLToPath } from "url";
import { pool } from "../dbConfig.js"; // Ensure proper initialization of pool

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../uploads");
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (error) {
  console.error("Error creating upload directory:", error.message);
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max size
  fileFilter: (req, file, cb) => {
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if ([".jpg", ".jpeg", ".png"].includes(fileExtension)) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed!"));
  },
});

export const uploadCandidatePicture = upload.single("candidatePicture");

// Fetch all candidates
export const getCandidates = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM candidates");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Fetch candidates by election
export const fetchCandidatesByElection = async (req, res) => {
  const { electionId } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM candidates WHERE electionid = $1",
      [electionId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add candidate
export const addCandidate = async (req, res) => {
  const picture = req.file;

  if (!picture) {
    return res.status(400).json({ error: "Candidate picture is required" });
  }

  const { electionId, name, party } = req.body;

  if (!electionId || !name || !party) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const imageUrl = path
      .relative(process.cwd(), picture.path)
      .replace(/\\/g, "/");
    await pool.query(
      "INSERT INTO candidates (electionid, name, party, image_url) VALUES ($1, $2, $3, $4)",
      [electionId, name, party, imageUrl]
    );
    res.status(201).json({ message: "Candidate added successfully." });
  } catch (error) {
    console.error("Error adding candidate:", error.message);
    if (picture && picture.path) {
      fs.unlink(picture.path, (err) => {
        if (err) console.error("Error deleting file:", err);
      });
    }
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Record vote
export const recordVote = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { candidateId, electionId, voterId } = req.body;

    // Check if election is active
    const electionStatus = await client.query(
      "SELECT * FROM elections WHERE electionid = $1 AND NOW() BETWEEN start_date AND end_date",
      [electionId]
    );

    if (electionStatus.rows.length === 0) {
      throw new Error("Election is not active");
    }

    // Check if voter has already voted in this election
    const voteCheck = await client.query(
      "SELECT * FROM votes WHERE voter_id = $1 AND election_id = $2",
      [voterId, electionId]
    );

    if (voteCheck.rows.length > 0) {
      throw new Error("Already voted in this election");
    }

    // Record the vote
    const result = await client.query(
      `INSERT INTO votes (candidateid, electionid, voterid, timestamp)
       VALUES ($1, $2, $3, NOW()) RETURNING id`,
      [candidateId, electionId, voterId]
    );

    // Update candidate vote count
    await client.query(
      `UPDATE votecounts 
       SET vote_count = vote_count + 1 
       WHERE candidateid = $1`,
      [candidateId]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Vote recorded successfully",
      data: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};
// Delete a candidate by ID
export const deleteCandidate = async (req, res) => {
  const { candidateId } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM candidates WHERE id = $1 RETURNING *",
      [candidateId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    res.status(200).json({ message: "Candidate deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const updateCandidate = async (req, res) => {
  const { candidateId } = req.params;
  const { name, party } = req.body;

  if (!name || !party) {
    return res
      .status(400)
      .json({ error: "Name and party fields are required." });
  }

  try {
    const result = await pool.query(
      "UPDATE candidates SET name = $1, party = $2 WHERE id = $3 RETURNING *",
      [name, party, candidateId]
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
