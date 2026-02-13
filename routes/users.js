const router = require('express').Router();
const User = require('../models/User');
const Activity = require('../models/Activity'); 
const authMiddleware = require('../middleware/authMiddleware');

// 1. GET CURRENT USER PROFILE
// This MUST come before /:username to prevent "me" being treated as a name
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (err) {
    console.error("Backend /me Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 2. GET LEADERBOARD
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

// 3. GET RECENT ACTIVITY FEED
router.get('/activities', async (req, res) => {
  try {
    const activities = await Activity.find()
      .sort({ timestamp: -1 }) 
      .limit(10); 
    res.status(200).json(activities);
  } catch (err) {
    res.status(500).json(err);
  }
});

// ==========================================
// ✅ NEW: ENROLL IN A COURSE
// ==========================================
router.put('/:username/enroll', async (req, res) => {
  try {
    const { courseId } = req.body;
    const user = await User.findOne({ username: req.params.username });

    if (!user) return res.status(404).json("User not found");

    // Ensure the array exists to prevent mapping errors
    if (!user.enrolledCourses) {
      user.enrolledCourses = [];
    }

    // Only enroll if they aren't already in the course
    if (!user.enrolledCourses.includes(String(courseId))) {
      user.enrolledCourses.push(String(courseId));

      // Log the enrollment to the global activity feed
      try {
        await Activity.create({
          username: user.username,
          avatar: user.avatar || "👨‍💻",
          action: "enrolled",
          detail: `Enrolled in Course Module ${courseId}`
        });
      } catch (logErr) {
        console.log("Failed to log enrollment activity:", logErr);
      }

      const updatedUser = await user.save();
      return res.status(200).json(updatedUser);
    } else {
      return res.status(400).json({ message: "Already enrolled in this course" });
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

// 4. UPDATE PROGRESS (XP & BADGES)
router.put('/:username/progress', async (req, res) => {
  try {
    const { xpEarned, courseId } = req.body;
    const user = await User.findOne({ username: req.params.username });

    if (!user) return res.status(404).json("User not found");

    user.xp += xpEarned;
    const newLevel = Math.floor(user.xp / 1000) + 1;
    let actionDetail = `Earned ${xpEarned} XP`;

    if (newLevel > user.level) {
      user.level = newLevel;
      actionDetail = `Leveled up to Level ${newLevel}!`;
    }

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

    if (courseId && !user.completedCourses.includes(String(courseId))) {
      user.completedCourses.push(String(courseId));
      if (!actionDetail.includes("Badge")) actionDetail = `Completed a Lesson`;
    }

    const updatedUser = await user.save();

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

// 5. GET USER STATS (MUST BE LAST)
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