const router = require('express').Router();
// Import the controller functions we just created
const authController = require('../controllers/authController');

// --- 1. REGISTER ---
router.post('/register', authController.register);

// --- 2. LOGIN ---
router.post('/login', authController.login);

// --- 3. FORGOT PASSWORD (New!) ---
router.post('/forgot-password', authController.forgotPassword);

// --- 4. RESET PASSWORD (New!) ---
router.post('/reset-password/:resetToken', authController.resetPassword);

module.exports = router;