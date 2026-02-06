const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// --- 1. REGISTER USER ---
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password (encryption)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    user = new User({
      username,
      email,
      password: hashedPassword
    });

    await user.save();

    // Create JWT Token (Login card)
    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ token, username: user.username, message: "User registered successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// --- 2. LOGIN USER ---
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    // Compare passwords
    // Note: This compares the plain text password with the hashed one in DB
    const isMatch = await bcrypt.compare(password, user.password);
    
    // Debugging logs (Remove these in production!)
    console.log("Login Attempt:", email);
    console.log("Password Match:", isMatch);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    // Create JWT Token
    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token, username: user.username });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// --- 3. FORGOT PASSWORD ---
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate Reset Token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and save to DB
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Create Reset Link (Frontend URL)
    // NOTE: Change 'localhost:5173' to your frontend port (often 5173 for Vite or 3000 for CRA)
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    // Setup Email Transporter
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Email Message
    const message = {
      from: `Support <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Password Reset Request',
      text: `You requested a password reset. Please go to this link to reset your password:\n\n${resetUrl}`
    };

    await transporter.sendMail(message);

    res.status(200).json({ success: true, data: "Email sent" });
  } catch (err) {
    console.error(err);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.status(500).json({ message: "Email could not be sent" });
  }
};

// --- 4. RESET PASSWORD ---
exports.resetPassword = async (req, res) => {
  // Hash the token from URL to compare
  const resetPasswordToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');

  try {
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Encrypt the new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);

    // Clear reset fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({ success: true, data: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};