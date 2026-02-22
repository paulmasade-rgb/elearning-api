const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// --- 1. REGISTER USER ---
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    let existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    let existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      username,
      email,
      password: hashedPassword
    });

    await user.save();

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
    const { identifier, password } = req.body;

    // ── DEBUG LOGGING: See exactly what arrives from the client ──
    console.log('LOGIN ATTEMPT FROM:', req.get('User-Agent'));
    console.log('Received identifier (raw):', JSON.stringify(identifier));
    console.log('Received password length:', password?.length || 'missing');
    console.log('Received password (first 3 + last 3 chars):', 
      password ? password.slice(0,3) + '...' + password.slice(-3) : 'missing');
    console.log('Full request body:', JSON.stringify(req.body, null, 2));
    // ─────────────────────────────────────────────────────────────

    // Clean inputs to remove leading/trailing whitespace or invisible chars
    const cleanIdentifier = (identifier || '').trim();
    const cleanPassword = (password || '').trim();

    let user = await User.findOne({ 
      $or: [{ email: cleanIdentifier }, { username: cleanIdentifier }] 
    });

    if (!user) {
      console.log('User not found for identifier:', cleanIdentifier);
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(cleanPassword, user.password);
    if (!isMatch) {
      console.log('Password mismatch for user:', user.username || user.email);
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Added user._id to match what the frontend expects for the handshake
    res.json({ token, username: user.username, role: user.role, _id: user._id });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).send('Server error');
  }
};

// --- 3. FORGOT PASSWORD ---
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  
  // FIX: Declare user OUTSIDE the try block so the catch block can access it
  let user; 

  try {
    user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');

    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    
    // Attempt to save the token FIRST
    await user.save(); 

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

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
    console.error("Forgot Password Error:", err);
    // FIX: Now safely accessible
    if (user) { 
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
    }
    res.status(500).json({ message: "Email could not be sent. Token cleared." });
  }
};

// --- 4. RESET PASSWORD ---
exports.resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({ success: true, data: "Password updated successfully" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: "Server Error during password update" });
  }
};