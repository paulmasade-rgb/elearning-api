const router = require('express').Router();
const authController = require('../controllers/authController');

// --- 1. REGISTER ---
router.post('/register', authController.register);

// --- 2. LOGIN ---
router.post('/login', authController.login);

// --- 3. FORGOT PASSWORD ---
// Matches Frontend: POST /api/auth/forgotpassword
router.post('/forgotpassword', authController.forgotPassword);

// --- 4. RESET PASSWORD ---
// ✅ FIX: Changed to PUT and removed the dash to match Frontend
router.put('/resetpassword/:resetToken', authController.resetPassword);

module.exports = router;