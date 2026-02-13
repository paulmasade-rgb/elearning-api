const express = require('express');
const router = express.Router();
const User = require('../models/User'); 
const Message = require('../models/Message');

// --- 1. SEND A FRIEND REQUEST ---
router.post('/request', async (req, res) => {
  const { fromId, toId } = req.body; 

  try {
    const targetUser = await User.findById(toId);
    if (!targetUser) return res.status(404).json({ error: 'Scholar not found' });

    if (targetUser.friends.includes(fromId)) {
      return res.status(400).json({ error: 'Scholar connection already exists!' });
    }

    const existingRequest = targetUser.friendRequests.find(
      (req) => req.from.toString() === fromId && req.status === 'pending'
    );

    if (existingRequest) {
      return res.status(400).json({ error: 'Request already pending.' });
    }

    targetUser.friendRequests.push({ from: fromId, status: 'pending' });
    await targetUser.save();

    res.json({ message: 'Request dispatched successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 2. RESPOND TO REQUEST ---
router.post('/respond', async (req, res) => {
  const { userId, requesterId, action } = req.body; 

  try {
    const user = await User.findById(userId);
    const requester = await User.findById(requesterId);

    if (!user || !requester) return res.status(404).json({ error: 'Scholar record not found' });

    const requestIndex = user.friendRequests.findIndex(
      (r) => r.from.toString() === requesterId && r.status === 'pending'
    );

    if (requestIndex === -1) {
      return res.status(404).json({ error: 'No active request found.' });
    }

    if (action === 'accept') {
      user.friends.push(requesterId);
      requester.friends.push(userId);
      user.friendRequests[requestIndex].status = 'accepted';
    } else {
      user.friendRequests[requestIndex].status = 'rejected';
    }

    await user.save();
    await requester.save();

    res.json({ message: `Connection ${action}ed!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 3. GET CHAT HISTORY ---
// ✅ SYNCED: Path matches ChatBox.jsx fetch
router.get('/messages/:user1/:user2', async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    
    const messages = await Message.find({
      $or: [
        { sender: user1, recipient: user2 },
        { sender: user2, recipient: user1 }
      ]
    }).sort({ createdAt: 1 }); 

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 4. SEND A MESSAGE ---
// ✅ SYNCED: Path matches ChatBox.jsx handleSend
router.post('/messages/send', async (req, res) => {
  // Destructuring from/to/text to match frontend request body
  const { from, to, text } = req.body;

  try {
    const newMessage = new Message({
      sender: from,      // Mapping 'from' to DB 'sender'
      recipient: to,     // Mapping 'to' to DB 'recipient'
      text: text         // Mapping 'text' to DB 'text'
    });

    await newMessage.save();
    res.json(newMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;