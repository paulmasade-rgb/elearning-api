const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// --- 1. REGISTER USER (WITH WELCOME EMAIL) ---
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

    // ✅ WELCOME EMAIL LOGIC
    try {
      const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        connectionTimeout: 10000 // 10s Timeout
      });

      const welcomeMessage = {
        from: `"VICI Academic Support" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Welcome to VICI – Your Academic Journey Begins!',
        html: `
          <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #f1f2f6; border-radius: 24px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #6c5ce7; margin: 0; font-size: 28px; font-weight: 800;">Welcome, Scholar ${user.username}!</h1>
              <p style="color: #636e72; font-size: 16px; margin-top: 10px;">Your VICI account is now active.</p>
            </div>
            <div style="text-align: center; margin: 40px 0;">
              <a href="${process.env.CLIENT_URL || 'https://elearning-gamified.vercel.app'}" 
                 style="background: linear-gradient(to right, #6c5ce7, #a29bfe); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 700; display: inline-block;">
                 Launch Dashboard
              </a>
            </div>
          </div>
        `
      };
      await transporter.sendMail(welcomeMessage);
    } catch (mailErr) {
      console.error("Welcome email failed:", mailErr.message);
    }

    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token, username: user.username, message: "User registered successfully" });
  } catch (err) {
    res.status(500).send('Server error');
  }
};

// --- 2. LOGIN USER (CASE-INSENSITIVE) ---
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const cleanIdentifier = (identifier || '').trim();
    const cleanPassword = (password || '').trim();

    let user = await User.findOne({ 
      $or: [
        { email: { $regex: new RegExp(`^${cleanIdentifier}$`, 'i') } }, 
        { username: { $regex: new RegExp(`^${cleanIdentifier}$`, 'i') } }
      ] 
    });

    if (!user) return res.status(400).json({ message: 'Invalid Credentials' });

    const isMatch = await bcrypt.compare(cleanPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid Credentials' });

    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, username: user.username, role: user.role, _id: user._id });
  } catch (err) {
    res.status(500).send('Server error');
  }
};

// --- 3. FORGOT PASSWORD (STRENGTHENED) ---
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
      service: 'Gmail',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { 
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
      },
      connectionTimeout: 10000 // Prevents 2-minute hangs
    });

    const message = {
      from: `"VICI Support" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Password Reset Request',
      text: `Academic Record Recovery Initiated.\n\nClick this link to reset your password:\n\n${resetUrl}`
    };

    console.log('Dispatching email via Gmail SMTP...');
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
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');
    const user = await User.findOne({ resetPasswordToken, resetPasswordExpires: { $gt: Date.now() } });

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();
    res.status(200).json({ success: true, data: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};