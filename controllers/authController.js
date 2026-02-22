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
    if (existingEmail) return res.status(400).json({ message: 'Email is already registered' });
    let existingUsername = await User.findOne({ username });
    if (existingUsername) return res.status(400).json({ message: 'Username is already taken' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    // ✅ WELCOME EMAIL (IPv4 FORCED)
    try {
      const transporter = nodemailer.createTransport({
        host: '74.125.142.108', // smtp.gmail.com IPv4
        port: 587,
        secure: false,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        tls: { rejectUnauthorized: false, servername: 'smtp.gmail.com' }
      });
      const welcomeMessage = {
        from: `"VICI Support" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Welcome to VICI!',
        html: `<div style="padding: 20px;"><h1>Welcome, ${user.username}!</h1><p>Your academic journey begins now.</p></div>`
      };
      await transporter.sendMail(welcomeMessage);
    } catch (mailErr) {
      console.error("Welcome email failed:", mailErr.message);
    }

    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token, username: user.username, message: "User registered successfully" });
  } catch (err) { res.status(500).send('Server error'); }
};

// --- 2. LOGIN USER ---
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const cleanId = (identifier || '').trim();
    let user = await User.findOne({ 
      $or: [
        { email: { $regex: new RegExp(`^${cleanId}$`, 'i') } }, 
        { username: { $regex: new RegExp(`^${cleanId}$`, 'i') } }
      ] 
    });
    if (!user) return res.status(400).json({ message: 'Invalid Credentials' });
    const isMatch = await bcrypt.compare((password || '').trim(), user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid Credentials' });

    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, username: user.username, role: user.role, _id: user._id });
  } catch (err) { res.status(500).send('Server error'); }
};

// --- 3. FORGOT PASSWORD (FORCED IPv4) ---
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  console.log('--- RESET ATTEMPT FOR:', email, '---');
  let user; 
  try {
    user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 3600000; 
    await user.save(); 

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    const transporter = nodemailer.createTransport({
      host: '74.125.142.108', // ✅ smtp.gmail.com IPv4 literal
      port: 587,
      secure: false, 
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      tls: {
        rejectUnauthorized: false,
        servername: 'smtp.gmail.com' // ✅ Required for cert verification
      },
      connectionTimeout: 15000 
    });

    const message = {
      from: `"VICI Support" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Password Reset Request',
      text: `Academic recovery link: ${resetUrl}`
    };

    console.log('Dispatching email via literal IPv4 host...');
    await transporter.sendMail(message);
    console.log('DISPATCH SUCCESSFUL');
    res.status(200).json({ success: true, data: "Email sent" });
  } catch (err) {
    console.error("FORGOT PASSWORD CRASH:", err.message);
    if (user) { 
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
    }
    res.status(500).json({ message: "Mail server error: " + err.message });
  }
};

// --- 4. RESET PASSWORD ---
exports.resetPassword = async (req, res) => {
  try {
    const token = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');
    const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: "Invalid or expired token" });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.status(200).json({ success: true, data: "Password updated successfully" });
  } catch (err) { res.status(500).json({ message: "Server Error" }); }
};