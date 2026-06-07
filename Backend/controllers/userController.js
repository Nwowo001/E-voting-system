import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../dbConfig.js';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import XLSX from 'xlsx';
import { sendOTPEmail } from '../utils/emailService.js';

/**
 * Parses a full name string (e.g. "ADEPOJU Gbolahan" or "AYO-ADEOSUN Joy Morayooluwa")
 * into { surname, firstName, otherName }.
 * The Excel format is: SURNAME Firstname [OtherNames...]
 */
const parseName = (fullName) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const surname = parts[0] || '';
  const firstName = parts[1] || '';
  const otherName = parts.slice(2).join(' ');
  return { surname, firstName, otherName };
};

/**
 * Reads eligible_voters.xlsx and returns a Map of:
 *   uppercase matric number → { surname, firstName, otherName }
 * collected from ALL sheets (100L, 200L, 300L, 400L).
 * Returns null if the file does not exist.
 */
const loadEligibleVoters = () => {
  const xlsxPath = path.join(process.cwd(), 'eligible_voters.xlsx');
  if (!fs.existsSync(xlsxPath)) return null;

  const workbook = XLSX.readFile(xlsxPath);
  const voters = new Map(); // matric → { surname, firstName, otherName }

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    rows.forEach((row) => {
      const matric = String(row[0] ?? '').trim().toUpperCase();
      const rawName = String(row[1] ?? '').trim();
      if (matric && rawName) {
        voters.set(matric, parseName(rawName));
      } else if (matric) {
        voters.set(matric, { surname: '', firstName: '', otherName: '' });
      }
    });
  });

  return voters;
};

/**
 * Validates that the matric number is in a plausible format.
 * Based on real data from eligible_voters.xlsx, formats include:
 *   22N02001       - 2 digits + 1-2 letters + 5 digits
 *   22N02005TS     - above with optional trailing letters
 *   ACU20252567    - 2-4 letters + 8 digits
 *   SP20220055     - 2 letters + 8 digits
 *   22EV01022      - 2 digits + 2 letters + 5 digits
 * Rule: must start with digits OR letters, contain only alphanumeric chars,
 * be between 6 and 15 characters, and not be all-numeric.
 */
const isValidMatricFormat = (matric) => {
  const upper = matric.trim().toUpperCase();
  // Must be 6–15 alphanumeric characters and contain at least one letter
  return /^[A-Z0-9]{6,15}$/.test(upper) && /[A-Z]/.test(upper);
};

dotenv.config();

// Multer memory storage configuration for profiles
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images are allowed'), false);
  },
});

// Helper to generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const signUp = async (req, res) => {
  const { name, email, password, matric_number } = req.body;
  if (!name || !email || !password || !matric_number) {
    return res.status(400).json({ message: 'Name, email, matric number, and password are required.' });
  }
  const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
  if (!passwordPattern.test(password)) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long and include both letters and numbers.' });
  }
  // --- Matric number format validation ---
  if (!isValidMatricFormat(matric_number)) {
    return res.status(400).json({
      message: 'Invalid matric number format. Expected formats: 24N04003 or ACU20251.',
    });
  }

  // --- Eligible voter check (reads all sheets from eligible_voters.xlsx) ---
  try {
    const eligibleVoters = loadEligibleVoters();
    if (eligibleVoters === null) {
      console.error('⛔ eligible_voters.xlsx not found. Blocking registration.');
      return res.status(503).json({
        message: 'Voter eligibility list is unavailable. Please contact the admin.',
      });
    }
    const matricKey = matric_number.trim().toUpperCase();
    if (!eligibleVoters.has(matricKey)) {
      return res.status(400).json({
        message: 'Your matric number is not in the list of eligible voters.',
      });
    }
  } catch (xlsxError) {
    console.error('⛔ Error reading eligible_voters.xlsx:', xlsxError.message);
    return res.status(503).json({
      message: 'Voter eligibility check failed. Please contact the admin.',
    });
  }

  try {
    const userExists = await pool.query(
      'SELECT * FROM users WHERE matric_number = $1',
      [matric_number]
    );
    if (userExists.rows.length > 0) {
      return res.status(409).json({ message: 'Matric number already registered.' });
    }
    
    const emailExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (emailExists.rows.length > 0) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password, matric_number, role, display_name, is_verified)
       VALUES ($1, $2, $3, $4, 'voter', $1, false) RETURNING id, name, email, role, matric_number`,
      [name, email, hashedPassword, matric_number]
    );
    const newUser = result.rows[0];

    // Generate and save OTP for verification
    const otp = generateOTP();
    await pool.query(
      `INSERT INTO otps (email, code, expires_at, type) 
       VALUES ($1, $2, NOW() + INTERVAL '15 minutes', 'registration')`,
      [email, otp]
    );

    // Send verification email asynchronously
    await sendOTPEmail(email, otp, 'registration');

    res.status(201).json({
      message: 'Account registered. Verification code sent to email.',
      email: email,
      requiresVerification: true
    });
  } catch (error) {
    console.error('Error during sign-up:', error.message);
    res.status(500).json({ message: 'Internal server error. Please try again later.' });
  }
};

export const verifyRegistration = async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ message: 'Email and verification code are required.' });
  }
  try {
    // Check for active OTP matching registration type
    const otpQuery = await pool.query(
      `SELECT * FROM otps 
       WHERE email = $1 AND code = $2 AND type = 'registration' AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, code]
    );

    if (otpQuery.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired verification code.' });
    }

    // Set user as verified
    await pool.query('UPDATE users SET is_verified = true WHERE email = $1', [email]);

    // Delete OTP
    await pool.query('DELETE FROM otps WHERE email = $1 AND type = \'registration\'', [email]);

    // Log the user in
    const userQuery = await pool.query('SELECT id, name, email, role, matric_number FROM users WHERE email = $1', [email]);
    const user = userQuery.rows[0];

    req.session.user = { id: user.id, email: user.email, role: user.role, name: user.name };
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.cookie('authToken', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 86400000 });

    res.status(200).json({
      message: 'Email verified successfully and logged in.',
      user,
      token
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ message: 'Server error during verification.' });
  }
};

export const resendOTP = async (req, res) => {
  const { email, type } = req.body; // type: 'registration' or 'password_reset'
  if (!email) return res.status(400).json({ message: 'Email is required' });

  const validTypes = ['registration', 'password_reset'];
  const otpType = validTypes.includes(type) ? type : 'registration';

  try {
    // Make sure user exists
    const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Generate new OTP
    const otp = generateOTP();
    // Delete existing OTP of same type
    await pool.query('DELETE FROM otps WHERE email = $1 AND type = $2', [email, otpType]);
    // Save new OTP
    await pool.query(
      `INSERT INTO otps (email, code, expires_at, type) 
       VALUES ($1, $2, NOW() + INTERVAL '15 minutes', $3)`,
      [email, otp, otpType]
    );

    // Send email
    await sendOTPEmail(email, otp, otpType);
    res.status(200).json({ message: 'A new verification code has been sent to your email.' });
  } catch (error) {
    console.error('Error resending OTP:', error);
    res.status(500).json({ message: 'Failed to send new code.' });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userQuery.rows.length === 0) {
      // For security, don't explicitly leak that email doesn't exist, but here we can return message
      return res.status(404).json({ message: 'No account found with this email address.' });
    }

    const otp = generateOTP();
    await pool.query('DELETE FROM otps WHERE email = $1 AND type = \'password_reset\'', [email]);
    await pool.query(
      `INSERT INTO otps (email, code, expires_at, type) 
       VALUES ($1, $2, NOW() + INTERVAL '15 minutes', 'password_reset')`,
      [email, otp]
    );

    await sendOTPEmail(email, otp, 'password_reset');
    res.status(200).json({ message: 'Password reset code sent to your email.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ message: 'Email, code, and new password are required.' });
  }

  const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
  if (!passwordPattern.test(newPassword)) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long and include both letters and numbers.' });
  }

  try {
    const otpQuery = await pool.query(
      `SELECT * FROM otps 
       WHERE email = $1 AND code = $2 AND type = 'password_reset' AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, code]
    );

    if (otpQuery.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired password reset code.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hashedPassword, email]);
    await pool.query('DELETE FROM otps WHERE email = $1 AND type = \'password_reset\'', [email]);

    res.status(200).json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password.' });
  }
};

export const login = async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ message: 'Identifier and password are required.' });
  }
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE matric_number = $1 OR email = $1 OR staff_id = $1',
      [identifier]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Restrict access for unverified emails (only for voter role, or globally depending on admin rules)
    if (!user.is_verified && user.role === 'voter') {
      return res.status(403).json({ 
        message: 'Account not verified. Please verify your email.',
        email: user.email,
        requiresVerification: true 
      });
    }

    req.session.user = { id: user.id, email: user.email, role: user.role, name: user.name };
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.cookie('authToken', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 86400000 });
    return res.status(200).json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, matric_number: user.matric_number, staff_id: user.staff_id, display_name: user.display_name, phone: user.phone, bio: user.bio, profile_image: user.profile_image },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, display_name, phone, bio } = req.body;
    
    const result = await pool.query(
      `UPDATE users 
       SET name = $1, email = $2, display_name = $3, phone = $4, bio = $5 
       WHERE id = $6 
       RETURNING id, name, email, role, matric_number, staff_id, display_name, phone, bio, profile_image`,
      [name, email, display_name, phone, bio, userId]
    );
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update profile:', error.message);
    res.status(500).json({ message: 'Failed to update profile.' });
  }
};

export const createStaffUser = async (req, res) => {
  const { name, email, password, staff_id, role } = req.body;
  if (!name || !password || !staff_id) {
    return res.status(400).json({ error: 'Name, staff ID, and password are required.' });
  }
  const allowedRoles = ['staff', 'admin'];
  const userRole = allowedRoles.includes(role) ? role : 'staff';
  try {
    const exists = await pool.query('SELECT * FROM users WHERE staff_id = $1', [staff_id]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'Staff ID already registered.' });
    }
    if (email) {
      const emailCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Email already registered.' });
      }
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password, staff_id, role, display_name, is_verified)
       VALUES ($1, $2, $3, $4, $5, $1, true) RETURNING id, name, email, role, staff_id`,
      [name, email || null, hashedPassword, staff_id, userRole]
    );
    res.status(201).json({ message: 'User created successfully.', user: result.rows[0] });
  } catch (error) {
    console.error('Error creating staff user:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

export const verifySession = async (req, res, next) => {
  const token = req.cookies.authToken;
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const logout = async (req, res) => {
  try {
    res.cookie('authToken', '', { httpOnly: true, expires: new Date(0), secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserInfo = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, display_name, matric_number, staff_id, profile_image, phone, bio, created_at FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user info:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, matric_number, staff_id, phone, bio FROM users');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required.' });
  }
  try {
    const userQuery = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
    if (userQuery.rows.length === 0) return res.status(404).json({ message: 'User not found.' });
    const user = userQuery.rows[0];
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: 'Current password is incorrect.' });
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
    res.status(200).json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Error changing password:', error.message);
    res.status(500).json({ message: 'Internal Server Error.' });
  }
};

/**
 * PUBLIC endpoint — verify a matric number and return the owner's name from the xlsx.
 * Used on the signup form so the student can confirm their identity before registering.
 * POST /api/users/verify-matric  { matric_number }
 */
export const verifyMatric = (req, res) => {
  const { matric_number } = req.body;
  if (!matric_number) {
    return res.status(400).json({ message: 'Matric number is required.' });
  }

  try {
    const eligibleVoters = loadEligibleVoters();
    if (eligibleVoters === null) {
      return res.status(503).json({ message: 'Eligibility list unavailable. Contact admin.' });
    }

    const key = matric_number.trim().toUpperCase();
    if (!eligibleVoters.has(key)) {
      return res.status(404).json({ message: 'Matric number not found in eligible voter list.' });
    }

    const { surname, firstName, otherName } = eligibleVoters.get(key);
    return res.status(200).json({ surname, firstName, otherName });
  } catch (err) {
    console.error('verifyMatric error:', err.message);
    return res.status(500).json({ message: 'Failed to verify matric number.' });
  }
};

