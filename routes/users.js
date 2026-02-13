const router = require('express').Router();
const User = require('../models/User');
const Activity = require('../models/Activity'); 
const authMiddleware = require('../middleware/authMiddleware');

// 1. GET CURRENT USER PROFILE (Used for authentication/session checks)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: "Scholar record not found" });
    res.status(200).json(user);
  } catch (err) {
    console.error("Backend /me Error:", err);
    res.status(500).json({ message: "System error" });
  }
});

// 2. UPDATE ACADEMIC PROFILE (New route for Major, Level, and Avatar)
router.put('/:username/profile', async (req, res) => {
  try {
    const { avatar, major, academicLevel } = req.body;
    const updatedUser = await User.findOneAndUpdate(
      { username: req.params.username },
      { 
        $set: { 
          avatar, 
          major, 
          academicLevel 
        } 
      },
      { new: true }
    ).select('-password');

    if (!updatedUser) return res.status(404).json("Scholar not found");

    // Optional: Log the update in the activity feed
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

// 3. GET ACADEMIC HALL OF FAME (Global Leaderboard)
router.get('/leaderboard', async (req, res) => {
  try {
    const topUsers = await User.find().sort({ xp: -1 }).limit(10);
    const leaderboard = topUsers.map((user) => ({
      _id: user._id, // Added _id for Messenger functionality
      username: user.username,
      xp: user.xp,
      level: user.level,
      avatar: user.avatar, // Added avatar
      major: user.major, // Added major
      academicLevel: user.academicLevel, // Added academicLevel
      badges: user.badges
    }));
    res.status(200).json(leaderboard);
  } catch (err) {
    res.status(500).json(err);
  }
});

// 4. GET INNER CIRCLE HALL OF FAME (Friend-only leaderboard)
router.get('/:username/friends-leaderboard', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json("Scholar not found");

    const friendsList = await User.find({
      $or: [
        { _id: { $in: user.friends } },
        { username: user.username }
      ]
    })
    .sort({ xp: -1 })
    .select('username xp level avatar major academicLevel badges');

    res.json(friendsList);
  } catch (err) {
    res.status(500).json(err);
  }
});

// 5. SEARCH DIRECTORY (Discovery)
router.get('/search/:query', async (req, res) => {
  try {
    const users = await User.find({ 
      username: { $regex: req.params.query, $options: 'i' } 
    })
    .limit(5)
    .select('username xp level avatar major academicLevel badges');
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json(err);
  }
});

// 6. DISPATCH FRIEND REQUEST
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
      res.status(400).json("Request already pending or scholarship connection exists.");
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

// 7. ACCEPT SCHOLAR CONNECTION
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

// 8. GET FULL ACADEMIC STATS
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .populate('friends', 'username xp level avatar major academicLevel')
      .populate('friendRequests.from', 'username xp level avatar major academicLevel');
    
    if (!user) return res.status(404).json("Scholar not found");
    const { password, ...otherDetails } = user.toObject();
    res.status(200).json(otherDetails);
  } catch (err) {
    console.error("🚨 DATABASE FETCH ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;