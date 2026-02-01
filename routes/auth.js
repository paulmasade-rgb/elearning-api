const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// 1. REGISTER ROUTE
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ username });
    if (userExists) return res.status(400).json({ message: "Username already taken" });

    // Encrypt the password (Security)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role: role || 'student'
    });

    const savedUser = await newUser.save();
    res.status(201).json(savedUser);

  } catch (err) {
    res.status(500).json(err);
  }
});

// 2. LOGIN ROUTE
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: "Wrong password" });

    // Send back user info (excluding password)
    const { password: hashedPassword, ...others } = user._doc;
    res.status(200).json(others);

  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;