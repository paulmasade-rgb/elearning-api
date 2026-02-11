const router = require('express').Router();
const User = require('../models/User');
const Activity = require('../models/Activity'); // ✅ 1. Import Activity Model

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

// 2. GET RECENT ACTIVITY FEED (✅ NEW ROUTE)
// This MUST come before /:username to avoid conflicts
router.get('/activities', async (req, res) => {
  try {
    const activities = await Activity.find()
      .sort({ timestamp: -1 }) // Newest first
      .limit(10); // Limit to top 10
    res.status(200).json(activities);
  } catch (err) {
    res.status(500).json(err);
  }
});

// 3. UPDATE PROGRESS (XP & BADGES)
router.put('/:username/progress', async (req, res) => {
  try {
    const { xpEarned, courseId } = req.body;
    const user = await User.findOne({ username: req.params.username });

    if (!user) return res.status(404).json("User not found");

    // A. Add XP
    user.xp += xpEarned;

    // B. Recalculate Level (1000 XP = 1 Level)
    const newLevel = Math.floor(user.xp / 1000) + 1;
    let actionDetail = `Earned ${xpEarned} XP`;

    if (newLevel > user.level) {
      user.level = newLevel;
      actionDetail = `Leveled up to Level ${newLevel}!`; // Upgrade the log message
    }

    // C. Check Badges
    if (user.xp >= 1000 && !user.badges.includes("Early Bird")) {
      user.badges.push("Early Bird");
      actionDetail = "Earned the 'Early Bird' Badge!";
    }
    if (user.xp >= 2500 && !user.badges.includes("Quiz Master")) {
      user.badges.push("Quiz Master");
      actionDetail = "Earned the 'Quiz Master' Badge!";
    }
    if (courseId === 1 && !user.badges.includes("Scholar")) { 
      user.badges.push("Scholar");
      actionDetail = "Completed Module 1 & Earned 'Scholar' Badge!";
    }

    // D. Mark Course as Completed
    if (courseId && !user.completedCourses.includes(String(courseId))) {
      user.completedCourses.push(String(courseId));
      if (!actionDetail.includes("Badge")) actionDetail = `Completed a Lesson`;
    }

    const updatedUser = await user.save();

    // ✅ E. LOG ACTIVITY TO FEED
    try {
        await Activity.create({
            username: user.username,
            avatar: user.avatar || "👨‍💻",
            action: "made progress",
            detail: actionDetail
        });
    } catch (logErr) {
        console.log("Failed to log activity:", logErr);
    }

    res.status(200).json(updatedUser);

  } catch (err) {
    res.status(500).json(err);
  }
});

// 4. GET USER STATS
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