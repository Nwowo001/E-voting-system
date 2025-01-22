import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../dbConfig.js";
import dotenv from "dotenv";

dotenv.config();

export const signUp = async (req, res) => {
  const { name, email, password, nin, voterID } = req.body;

  // Validate required fields
  if (!name || !email || !password || !nin || !voterID) {
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
      "SELECT * FROM users WHERE email = $1 OR voterID = $2",
      [email, voterID]
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
      `INSERT INTO users (name, email, password, nin, voterID, role, display_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, email, role, display_name`,
      [name, email, hashedPassword, nin, voterID, role, displayName]
    );

    const newUser = result.rows[0];

    // Generate JWT token for the user
    const token = jwt.sign(
      { userId: newUser.id, role: newUser.role },
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
    // Check if the user exists
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
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

    res.json({
      message: "Login successful",
      role: user.role,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error during login:", error.message);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

export const logout = (req, res) => {
  res.clearCookie("authToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.status(200).json({ message: "Logout successful." });
};

export const getUserInfo = async (req, res) => {
  const userId = req.userId;

  try {
    const result = await pool.query(
      "SELECT id, name, email, role, display_name FROM users WHERE id = $1",
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
    const result = await pool.query("SELECT id, name, email, role FROM users");
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching users:", error.message);
    res.status(500).json({ error: "Internal Server Error." });
  }
};

export const createUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res
      .status(400)
      .json({ error: "Please provide all required fields." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const displayName = name;
    const result = await pool.query(
      "INSERT INTO users (name, email, password, role, display_name) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, display_name",
      [name, email, hashedPassword, role, displayName]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating user:", error.message);
    res.status(500).json({ error: "Internal Server Error." });
  }
};
