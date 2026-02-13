const router = require('express').Router();
const User = require('../models/User');
const Activity = require('../models/Activity'); 
const authMiddleware = require('../middleware/authMiddleware');

// 1. GET CURRENT USER PROFILE
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

// 2. GET GLOBAL LEADERBOARD
router.get('/leaderboard', async (req, res) => {
  try {
    const topUsers = await User.find().sort({ xp: -1 }).limit(10);
    const leaderboard = topUsers.map((user) => ({
      username: user.username,
      xp: user.xp,
      level: user.level,
      badges: user.badges
    }));
    res.status(200).json(leaderboard);
  } catch (err) {
    res.status(500).json(err);
  }
});

// 3. GET FRIEND-ONLY HALL OF FAME
router.get('/:username/friends-leaderboard', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json("User not found");

    const friendsList = await User.find({
      $or: [
        { _id: { $in: user.friends } },
        { username: user.username }
      ]
    })
    .sort({ xp: -1 })
    .select('username xp level avatar badges');

    res.status(200).json(friendsList);
  } catch (err) {
    res.status(500).json(err);
  }
});

// 4. SEARCH STUDENTS (For Discovery)
router.get('/search/:query', async (req, res) => {
  try {
    const users = await User.find({ 
      username: { $regex: req.params.query, $options: 'i' } 
    }).limit(5).select('username xp level badges');
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json(err);
  }
});

// 5. SEND FRIEND REQUEST
router.put('/:username/request', async (req, res) => {
  try {
    const target = await User.findOne({ username: req.params.username });
    const sender = await User.findOne({ username: req.body.currentUsername });

    if (!target) return res.status(404).json("Target user not found");

    const alreadyRequested = target.friendRequests.some(r => r.from.equals(sender._id));
    const alreadyFriends = target.friends.includes(sender._id);

    if (!alreadyRequested && !alreadyFriends) {
      await target.updateOne({ 
        $push: { friendRequests: { from: sender._id, status: 'pending' } } 
      });
      res.status(200).json("Friend request sent!");
    } else {
      res.status(400).json("Request already exists or already friends.");
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

// 6. ACCEPT FRIEND REQUEST
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
        action: "made a friend",
        detail: `Became friends with ${requester.username}!`
    });

    res.status(200).json("Friendship established!");
  } catch (err) {
    res.status(500).json(err);
  }
});

// 7. GET USER STATS (Final Profile Fetch)
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .populate('friends', 'username xp level')
      .populate('friendRequests.from', 'username xp level');
    
    if (!user) return res.status(404).json("User not found");
    const { password, ...otherDetails } = user.toObject();
    res.status(200).json(otherDetails);
  } catch (err) {
    console.error("🚨 BACKEND CRASH ON GET USER:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;