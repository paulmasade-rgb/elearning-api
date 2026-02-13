const router = require('express').Router();
const authController = require('../controllers/authController');

// --- 1. SCHOLAR REGISTRATION ---
// Incoming: { username, email, password, major, academicLevel, role }
router.post('/register', authController.register);

// --- 2. SCHOLAR LOGIN ---
// Incoming: { identifier, password }
router.post('/login', authController.login);

// --- 3. CREDENTIAL RECOVERY ---
router.post('/forgotpassword', authController.forgotPassword);

// --- 4. SECURE PASSWORD RESET ---
router.put('/resetpassword/:resetToken', authController.resetPassword);

module.exports = router;