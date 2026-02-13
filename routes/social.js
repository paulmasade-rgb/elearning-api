const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Adjust path if your models are in a different folder
const Message = require('../models/Message');

// --- 1. SEND A FRIEND REQUEST ---
router.post('/request', async (req, res) => {
  const { fromId, toId } = req.body; // "fromId" is the sender, "toId" is the receiver

  try {
    const targetUser = await User.findById(toId);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    // Check if they are already friends
    if (targetUser.friends.includes(fromId)) {
      return res.status(400).json({ error: 'You are already friends!' });
    }

    // Check if a request is already pending
    const existingRequest = targetUser.friendRequests.find(
      (req) => req.from.toString() === fromId && req.status === 'pending'
    );

    if (existingRequest) {
      return res.status(400).json({ error: 'Friend request already sent.' });
    }

    // Add the request
    targetUser.friendRequests.push({ from: fromId, status: 'pending' });
    await targetUser.save();

    res.json({ message: 'Friend request sent successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 2. ACCEPT / REJECT FRIEND REQUEST ---
router.post('/respond', async (req, res) => {
  const { userId, requesterId, action } = req.body; // action = 'accept' or 'reject'

  try {
    const user = await User.findById(userId);
    const requester = await User.findById(requesterId);

    if (!user || !requester) return res.status(404).json({ error: 'User not found' });

    // Find the request in the user's list
    const requestIndex = user.friendRequests.findIndex(
      (r) => r.from.toString() === requesterId && r.status === 'pending'
    );

    if (requestIndex === -1) {
      return res.status(404).json({ error: 'No pending request found from this user.' });
    }

    if (action === 'accept') {
      // Add each other to friends lists
      user.friends.push(requesterId);
      requester.friends.push(userId);
      
      // Update request status
      user.friendRequests[requestIndex].status = 'accepted';
    } else {
      // Reject request
      user.friendRequests[requestIndex].status = 'rejected';
    }

    // Save both users
    await user.save();
    await requester.save();

    res.json({ message: `Friend request ${action}ed!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 3. GET CHAT HISTORY ---
router.get('/chat/:user1/:user2', async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    
    // Find messages sent by EITHER user to the OTHER user
    const messages = await Message.find({
      $or: [
        { sender: user1, recipient: user2 },
        { sender: user2, recipient: user1 }
      ]
    }).sort({ createdAt: 1 }); // Sort by oldest first (like a real chat)

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 4. SEND A MESSAGE ---
router.post('/message', async (req, res) => {
  const { sender, recipient, content } = req.body;

  try {
    const newMessage = new Message({
      sender,
      recipient,
      content
    });

    await newMessage.save();
    res.json(newMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;