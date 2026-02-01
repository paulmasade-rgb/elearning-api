const router = require('express').Router();
const User = require('../models/User');

// 1. GET LEADERBOARD
router.get('/leaderboard', async (req, res) => {
  try {
    const topUsers = await User.find().sort({ xp: -1 }).limit(10);
    const leaderboard = topUsers.map((user) => ({
      username: user.username,
      xp: user.xp,
      badges: user.badges
    }));
    res.status(200).json(leaderboard);
  } catch (err) {
    res.status(500).json(err);
  }
});

// 2. UPDATE PROGRESS (XP & BADGES) <--- NEW !!!
router.put('/:username/progress', async (req, res) => {
  try {
    const { xpEarned, courseId } = req.body;
    const user = await User.findOne({ username: req.params.username });

    if (!user) return res.status(404).json("User not found");

    // A. Add XP
    user.xp += xpEarned;

    // B. Recalculate Level (1000 XP = 1 Level)
    const newLevel = Math.floor(user.xp / 1000) + 1;
    if (newLevel > user.level) {
      // You could send a "LEVEL UP" message back here if you wanted
      user.level = newLevel;
    }

    // C. Check Badges
    if (user.xp >= 1000 && !user.badges.includes("Early Bird")) {
        user.badges.push("Early Bird");
    }
    if (user.xp >= 2500 && !user.badges.includes("Quiz Master")) {
        user.badges.push("Quiz Master");
    }
    if (courseId === 1 && !user.badges.includes("Scholar")) { 
         user.badges.push("Scholar");
    }

    // D. Mark Course as Completed
    if (courseId && !user.completedCourses.includes(String(courseId))) {
        user.completedCourses.push(String(courseId));
    }

    const updatedUser = await user.save();
    res.status(200).json(updatedUser);

  } catch (err) {
    res.status(500).json(err);
  }
});

// 3. GET USER STATS
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json("User not found");
    const { password, ...otherDetails } = user._doc;
    res.status(200).json(otherDetails);
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;