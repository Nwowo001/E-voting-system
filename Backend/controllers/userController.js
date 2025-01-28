import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../dbConfig.js";
import dotenv from "dotenv";

dotenv.config();

export const signUp = async (req, res) => {
  const { name, email, password, nin, voterid } = req.body;

  // Validate required fields
  if (!name || !email || !password || !nin || !voterid) {
    return res.status(400).json({ message: "All fields are required." });
  }

  // Validate password strength
  const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
  if (!passwordPattern.test(password)) {
    return res.status(400).json({
      message:
        "Password must be at least 6 characters long and include both letters and numbers.",
    });
  }

  try {
    // Check if email or voterID already exists
    const userExists = await pool.query(
      "SELECT * FROM users WHERE email = $1 OR voterid = $2",
      [email, voterid]
    );

    if (userExists.rows.length > 0) {
      return res
        .status(409)
        .json({ message: "Email or Voter ID already exists." });
    }

    // Assign role based on email
    const role = email.includes("@admin.com") ? "admin" : "voter";
    const hashedPassword = await bcrypt.hash(password, 10);
    const displayName = name; // Display name for the user

    // Insert user into database
    const result = await pool.query(
      `INSERT INTO users (name, email, password, nin, voterid, role, display_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, email, role, display_name, voterid`,
      [name, email, hashedPassword, nin, voterid, role, displayName]
    );

    const newUser = result.rows[0];

    // Generate JWT token for the user
    const token = jwt.sign(
      { userId: newUser.id, role: newUser.role, voterid: newUser.voterid },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Set token in a secure cookie
    res.cookie("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600000,
      sameSite: "lax",
    });

    res.status(201).json({
      message: "Account created successfully.",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        voterid: newUser.voterid,
      },
    });
  } catch (error) {
    console.error("Error during sign-up:", error.message);
    res
      .status(500)
      .json({ message: "Internal server error. Please try again later." });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Create session data
    req.session.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      voterid: user.voterid,
    };

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, voterid: user.voterid, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    // Set secure cookie with token
    res.cookie("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Set session cookie
    res.cookie("sessionId", req.session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        voterid: user.voterid,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const verifySession = async (req, res, next) => {
  const token = req.cookies.authToken;
  const sessionId = req.cookies.sessionId;

  if (!token || !sessionId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    req.voterid = decoded.voterid;

    if (req.session.id !== sessionId) {
      return res.status(401).json({ message: "Invalid session" });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const refreshSession = async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "No active session" });
  }

  const newToken = jwt.sign(
    {
      userId: req.session.user.id,
      role: req.session.user.role,
      voterid: req.session.user.voterid,
    },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );

  res.cookie("authToken", newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({ message: "Session refreshed" });
};

export const logout = (req, res) => {
  // Clear session
  req.session.destroy();

  // Clear cookies
  res.clearCookie("authToken");
  res.clearCookie("sessionId");

  return res.status(200).json({ message: "Logged out successfully" });
};

export const getUserInfo = async (req, res) => {
  const userId = req.userId;

  try {
    const result = await pool.query(
      "SELECT id, name, email, role, display_name, voterid FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching user info:", error.message);
    res.status(500).json({ error: "Internal Server Error." });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, role, voterid FROM users"
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching users:", error.message);
    res.status(500).json({ error: "Internal Server Error." });
  }
};

export const createUser = async (req, res) => {
  const { name, email, password, role, voterid } = req.body;

  if (!name || !email || !password || !role || !voterid) {
    return res
      .status(400)
      .json({ error: "Please provide all required fields." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const displayName = name;
    const result = await pool.query(
      "INSERT INTO users (name, email, password, role, display_name, voterid) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role, display_name, voterid",
      [name, email, hashedPassword, role, displayName, voterid]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating user:", error.message);
    res.status(500).json({ error: "Internal Server Error." });
  }
};
