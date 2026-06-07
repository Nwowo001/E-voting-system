import express from 'express';
import { pool } from '../dbConfig.js';
import path from 'path';
import { 
  signUp, 
  verifyRegistration, 
  resendOTP, 
  forgotPassword, 
  resetPassword, 
  login, 
  logout, 
  getUserInfo, 
  changePassword, 
  updateProfile,
  verifyMatric,
  upload 
} from '../controllers/userController.js';
import { authenticateToken, adminOnly } from '../middlewares/authMiddleware.js';
import { uploadToSupabase } from '../utils/supabaseService.js';

const router = express.Router();

router.post('/sign-up', signUp);
router.post('/verify-matric', verifyMatric);   // public — matric lookup before signup
router.post('/verify-registration', verifyRegistration);
router.post('/resend-otp', resendOTP);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/login', login);
router.post('/logout', logout);

router.post('/update-profile', authenticateToken, updateProfile);

router.post('/upload-profile-image', authenticateToken, upload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const userId = req.user.id;
    
    // Upload profile image to Supabase (with fallback)
    const imagePath = await uploadToSupabase(
      req.file.buffer,
      `profile_${userId}_${Date.now()}${path.extname(req.file.originalname || '.jpg')}`,
      req.file.mimetype,
      "profiles"
    );

    await pool.query('UPDATE users SET profile_image = $1 WHERE id = $2', [imagePath, userId]);
    res.status(200).json({ message: 'Profile image uploaded successfully', imageUrl: imagePath });
  } catch (error) {
    console.error('Profile image upload error:', error.message);
    res.status(500).json({ error: 'Failed to upload profile image' });
  }
});

router.get('/user-info', authenticateToken, getUserInfo);
router.post('/change-password', authenticateToken, changePassword);

// Admin User Management Routes (expected by Voters.jsx)
router.put('/:id', authenticateToken, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  try {
    const result = await pool.query(
      'UPDATE users SET name = $1, display_name = $1, email = $2 WHERE id = $3 RETURNING *',
      [name, email, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ message: 'User updated successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Error updating user:', error.message);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/:id', authenticateToken, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ message: 'User deleted successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Error deleting user:', error.message);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
