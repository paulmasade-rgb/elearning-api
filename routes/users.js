const router = require('express').Router();
const User = require('../models/User');
const Activity = require('../models/Activity'); 
const authMiddleware = require('../middleware/authMiddleware');

// --- 0. GET ALL SCHOLARS (Admin/Directory) ---
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 1. GET GLOBAL ACTIVITY FEED ---
router.get('/activities', async (req, res) => {
  try {
    const activities = await Activity.find().sort({ createdAt: -1 }).limit(10);
    res.status(200).json(activities);
  } catch (err) {
    res.status(500).json({ error: "Could not fetch activity feed" });
  }
});

// --- 2. GET CURRENT USER PROFILE ---
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: "Scholar record not found" });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: "System error" });
  }
});

// --- 3. GLOBAL HALL OF FAME (Leaderboard) ---
router.get('/leaderboard', async (req, res) => {
  try {
    const leaderboard = await User.find()
      .sort({ xp: -1 })
      .limit(10)
      .select('username xp level avatar major academicLevel badges');
    res.status(200).json(leaderboard);
  } catch (err) {
    res.status(500).json(err);
  }
});

// --- 4. SEARCH DIRECTORY ---
router.get('/search/:query', async (req, res) => {
  try {
    const users = await User.find({ 
      username: { $regex: req.params.query, $options: 'i' } 
    }).limit(5).select('username xp level avatar major academicLevel');
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json(err);
  }
});

// --- 5. GET LEARNING ANALYTICS (REAL DATABASE ENGINE) ---
router.get('/:username/stats', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json("Scholar not found");

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let displayStreak = user.currentStreak || 0;
    if (user.lastActiveDate !== todayStr && user.lastActiveDate !== yesterdayStr) {
      displayStreak = 0; 
    }

    // ✅ FIX: Returns real accuracy from the database
    res.status(200).json({
      xp: user.xp || 0,
      streak: displayStreak,
      accuracy: user.accuracy || 0, 
      weeklyActivity: user.weeklyActivity 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 6. UPDATE ACADEMIC PROFILE ---
router.put('/:username/profile', async (req, res) => {
  try {
    const { avatar, major, academicLevel } = req.body;
    const updatedUser = await User.findOneAndUpdate(
      { username: req.params.username },
      { $set: { avatar, major, academicLevel } },
      { new: true }
    ).select('-password');

    if (!updatedUser) return res.status(404).json("Scholar not found");

    await Activity.create({
      username: updatedUser.username,
      action: "updated profile",
      detail: `Updated academic record to ${academicLevel} ${major}.`
    });

    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 7. COURSE ENROLLMENT ---
router.put('/:username/enroll', async (req, res) => {
  try {
    const { courseId } = req.body;
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json("Scholar not found");

    if (!user.enrolledCourses) user.enrolledCourses = [];
    if (user.enrolledCourses.includes(String(courseId))) {
      return res.status(400).json("Already enrolled in this course");
    }

    user.enrolledCourses.push(String(courseId));
    await user.save();

    await Activity.create({
      username: user.username,
      action: "enrolled",
      detail: `Registered for course sequence: ${courseId}`
    });

    res.status(200).json("Successfully enrolled in course!");
  } catch (err) {
    res.status(500).json({ error: "Could not process enrollment" });
  }
});

// --- 8. DISPATCH FRIEND REQUEST ---
router.put('/:username/request', async (req, res) => {
  try {
    const target = await User.findOne({ username: req.params.username });
    const sender = await User.findOne({ username: req.body.currentUsername });

    if (!target || !sender) return res.status(404).json("User record not found");

    const alreadyRequested = target.friendRequests.some(r => r.from.equals(sender._id));
    const alreadyFriends = target.friends.includes(sender._id);

    if (!alreadyRequested && !alreadyFriends) {
      await target.updateOne({ 
        $push: { friendRequests: { from: sender._id, status: 'pending' } } 
      });
      res.status(200).json("Friend request dispatched!");
    } else {
      res.status(400).json("Request already pending or connection exists.");
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

// --- 9. ACCEPT SCHOLAR CONNECTION ---
router.put('/:username/accept', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    const requester = await User.findOne({ username: req.body.requesterUsername });

    await user.updateOne({
      $pull: { friendRequests: { from: requester._id } },
      $push: { friends: requester._id }
    });
    await requester.updateOne({ $push: { friends: user._id } });

    await Activity.create({
        username: user.username,
        action: "connected",
        detail: `Established academic connection with ${requester.username}!`
    });

    res.status(200).json("Connection established!");
  } catch (err) {
    res.status(500).json(err);
  }
});

// --- 10. GET FULL ACADEMIC STATS ---
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .populate('friends', 'username xp level avatar major academicLevel')
      .populate('friendRequests.from', 'username xp level avatar major academicLevel');
    if (!user) return res.status(404).json("Scholar not found");
    const { password, ...otherDetails } = user.toObject();
    res.status(200).json(otherDetails);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 11. GET FRIENDS LEADERBOARD (Inner Circle) ---
router.get('/:username/friends-leaderboard', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ message: "Scholar record not found" });

    const circleIds = [...user.friends, user._id];

    const rankings = await User.find({ _id: { $in: circleIds } })
      .select('username xp level avatar major academicLevel badges')
      .sort({ xp: -1 });

    res.status(200).json(rankings);
  } catch (err) {
    res.status(500).json({ error: "Failed to assemble the Inner Circle rankings." });
  }
});

// --- 12. SYNC PROGRESS (FIXED FOR LIVE FEED & ACCURACY) ---
router.put('/:username/progress', async (req, res) => {
  try {
    const { xpEarned, courseId, courseTitle, stats } = req.body;
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json("Scholar not found");

    // ✅ ACCURACY LOGIC: Calculates real percentage from quiz data
    if (stats) {
      user.totalQuestions = (user.totalQuestions || 0) + stats.total;
      user.correctAnswers = (user.correctAnswers || 0) + stats.correct;
      user.accuracy = Math.round((user.correctAnswers / user.totalQuestions) * 100);
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (user.lastActiveDate === yesterdayStr) {
      user.currentStreak += 1;
    } else if (user.lastActiveDate !== todayStr) {
      user.currentStreak = 1;
    }

    let multiplier = 1;
    if (user.currentStreak >= 5) multiplier = 2.0;
    else if (user.currentStreak >= 3) multiplier = 1.5;

    const finalXP = Math.round(xpEarned * multiplier);
    user.xp = (user.xp || 0) + finalXP;
    user.level = Math.floor(user.xp / 1000) + 1;

    user.lastActiveDate = todayStr;

    if (courseId && !user.completedCourses.includes(String(courseId))) {
      user.completedCourses.push(String(courseId));
    }

    await user.save();

    // ✅ LIVE FEED LOGIC: Explicitly logs the master module record
    await Activity.create({
      username: user.username,
      action: "completed lesson",
      detail: `Mastered ${courseTitle || 'a module'} with ${user.accuracy}% accuracy! Earned +${finalXP} XP ${multiplier > 1 ? `(x${multiplier} Streak 🔥)` : ''}`,
      timestamp: new Date()
    });

    res.status(200).json({ xp: user.xp, level: user.level, accuracy: user.accuracy });
  } catch (err) {
    res.status(500).json({ error: "Academic sync failed" });
  }
});

// --- 13. ADMIN: DATA OVERRIDE ---
router.put('/:username/admin-edit', async (req, res) => {
  try {
    const { xp, level, academicLevel, major } = req.body;
    const updated = await User.findOneAndUpdate(
      { username: req.params.username },
      { $set: { xp, level, academicLevel, major } },
      { new: true }
    );
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json(err);
  }
});

// --- 14. ADMIN: TOGGLE BAN STATUS ---
router.put('/:username/toggle-ban', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json("Scholar not found");

    user.isBanned = !user.isBanned;
    await user.save();

    const status = user.isBanned ? "Restricted" : "Reactivated";
    
    await Activity.create({
      username: "SYSTEM",
      action: "moderation",
      detail: `Scholar ${user.username} has been ${status.toLowerCase()}.`
    });

    res.status(200).json({ message: `Scholar ${status}`, isBanned: user.isBanned });
  } catch (err) {
    res.status(500).json({ error: "Moderation link failed." });
  }
});

module.exports = router;