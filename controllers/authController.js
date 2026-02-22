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

    // ✅ SEND WELCOME EMAIL
    try {
      const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
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
            <div style="color: #2d3436; line-height: 1.6; font-size: 16px;">
              <p>You have successfully registered for the VICI Student Portal. You now have full access to our gamified curriculum, academic analytics, and community forums.</p>
              <p>Your current status is set to <b>Independent Scholar</b>. Start your first module today to begin earning XP and unlocking milestone badges.</p>
            </div>
            <div style="text-align: center; margin: 40px 0;">
              <a href="${process.env.CLIENT_URL || 'https://elearning-gamified.vercel.app'}" 
                 style="background: linear-gradient(to right, #6c5ce7, #a29bfe); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 700; display: inline-block; box-shadow: 0 10px 20px rgba(108, 92, 231, 0.2);">
                 Launch Academic Dashboard
              </a>
            </div>
            <hr style="border: 0; border-top: 1px solid #f1f2f6; margin: 30px 0;">
            <p style="font-size: 12px; color: #b2bec3; text-align: center; margin: 0;">
              This is an automated academic notification. If you did not create this account, please contact support.
            </p>
          </div>
        `
      };

      await transporter.sendMail(welcomeMessage);
    } catch (mailErr) {
      console.error("Welcome email failed, but user was created:", mailErr.message);
    }

    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ token, username: user.username, message: "User registered successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// --- 2. LOGIN USER (CASE-INSENSITIVE) ---
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // ── DEBUG LOGGING ──
    console.log('LOGIN ATTEMPT FROM:', req.get('User-Agent'));
    console.log('Received identifier (raw):', JSON.stringify(identifier));
    console.log('Received password length:', password?.length || 'missing');
    
    const cleanIdentifier = (identifier || '').trim();
    const cleanPassword = (password || '').trim();

    // ✅ CASE-INSENSITIVE SEARCH
    let user = await User.findOne({ 
      $or: [
        { email: { $regex: new RegExp(`^${cleanIdentifier}$`, 'i') } }, 
        { username: { $regex: new RegExp(`^${cleanIdentifier}$`, 'i') } }
      ] 
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(cleanPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    // ✅ Return the literal username from DB
    res.json({ token, username: user.username, role: user.role, _id: user._id });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).send('Server error: ' + err.message);
  }
};

// --- 3. FORGOT PASSWORD ---
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  let user; 
  try {
    user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 3600000; 
    
    await user.save(); 

    // ✅ FIX: Prioritize CLIENT_URL from Render env variables
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    const message = {
      from: `VICI Support <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Password Reset Request',
      text: `Academic Record Recovery Initiated.\n\nClick this link to reset your password:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`
    };

    await transporter.sendMail(message);
    res.status(200).json({ success: true, data: "Email sent" });
  } catch (err) {
    if (user) { 
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
    }
    res.status(500).json({ message: "Email could not be sent." });
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
    res.status(500).json({ message: "Server Error during password update" });
  }
};