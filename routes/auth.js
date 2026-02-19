const router = require('express').Router();
const authController = require('../controllers/authController');

// --- 1. SCHOLAR REGISTRATION ---
router.post('/register', authController.register);

// --- 2. SCHOLAR LOGIN ---
router.post('/login', authController.login);

// --- 3. CREDENTIAL RECOVERY ---
// ✅ Updated to match frontend: /api/auth/forgot-password
router.post('/forgot-password', authController.forgotPassword);

// --- 4. SECURE PASSWORD RESET ---
// ✅ Updated to match frontend: /api/auth/reset-password
router.put('/reset-password/:resetToken', authController.resetPassword);

module.exports = router;