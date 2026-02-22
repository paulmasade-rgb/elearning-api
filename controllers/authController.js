const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios'); // ✅ Ensure axios is installed: npm install axios

// --- 1. REGISTER USER (API VERSION) ---
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

    // ✅ WELCOME EMAIL VIA RESEND API
    try {
      await axios.post('https://api.resend.com/emails', {
        from: 'VICI Support <onboarding@resend.dev>', // You can customize this later with a domain
        to: [user.email],
        subject: 'Welcome to VICI!',
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h1 style="color: #6c5ce7;">Welcome, ${user.username}!</h1>
            <p>Your academic journey begins now. Your account is active and ready.</p>
          </div>
        `
      }, {
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }
      });
      console.log('Welcome email dispatched via API');
    } catch (mailErr) {
      console.error("Welcome email API failure:", mailErr.response?.data || mailErr.message);
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

// --- 3. FORGOT PASSWORD (API VERSION) ---
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

    const clientUrl = process.env.CLIENT_URL || 'https://elearning-gamified.vercel.app';
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    // ✅ THE API FIX (Bypasses all Render Port/IPv6 Blocks)
    const response = await axios.post('https://api.resend.com/emails', {
      from: 'VICI Support <onboarding@resend.dev>',
      to: [user.email],
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: sans-serif; line-height: 1.5;">
          <h2 style="color: #2d3436;">Academic Record Recovery</h2>
          <p>You requested a password reset. Please click the link below:</p>
          <a href="${resetUrl}" style="background: #6c5ce7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
          <p style="color: #636e72; font-size: 12px; margin-top: 20px;">Link expires in 1 hour.</p>
        </div>
      `
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('API DISPATCH SUCCESSFUL:', response.data.id);
    res.status(200).json({ success: true, data: "Email sent via API" });
  } catch (err) {
    console.error("FORGOT PASSWORD API ERROR:", err.response?.data || err.message);
    if (user) { 
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
    }
    res.status(500).json({ message: "Email delivery system failed to connect." });
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