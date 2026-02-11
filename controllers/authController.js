const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// --- 1. REGISTER USER ---
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if Email exists
    let existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    // Check if Username exists (Enforce Uniqueness)
    let existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create User
    const user = new User({
      username,
      email,
      password: hashedPassword
    });

    await user.save();

    // Generate Token
    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ token, username: user.username, message: "User registered successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// --- 2. LOGIN USER (Email OR Username) ---
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Search for user by Email OR Username
    let user = await User.findOne({ 
      $or: [{ email: identifier }, { username: identifier }] 
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    // Check Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    // Generate Token
    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token, username: user.username, role: user.role });
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

    // Hash and Save Token
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Create Link (Matches your Vercel/Local setup)
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    // Send Email
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const message = {
      from: `Support <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Password Reset Request',
      text: `Click this link to reset your password:\n\n${resetUrl}`
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
  const resetPasswordToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');

  try {
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Update Password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({ success: true, data: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};