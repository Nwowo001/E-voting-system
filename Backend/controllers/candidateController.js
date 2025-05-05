// candidateController.js
import path from "path";
import multer from "multer";
import fs from "fs";
import { fileURLToPath } from "url";
import { pool } from "../dbConfig.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
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
  const { electionId, name, party } = req.body;

  if (!picture) {
    return res.status(400).json({ error: "Candidate picture is required." });
  }

  if (!electionId || !name || !party) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const imageUrl = `/uploads/${picture.filename}`; // Relative path for frontend
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
      "SELECT * FROM candidates WHERE electionid = $1",
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
  const { name, party } = req.body;

  if (!name || !party) {
    return res
      .status(400)
      .json({ error: "Name and party fields are required." });
  }

  try {
    const result = await pool.query(
      "UPDATE candidates SET name = $1, party = $2 WHERE candidateid = $3 RETURNING *",
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
