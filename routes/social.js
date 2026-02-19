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
router.get('/messages/:user1/:user2', async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    
    const messages = await Message.find({
      $or: [
        { sender: user1, recipient: user2 },
        { sender: user2, recipient: user1 }
      ]
    }).sort({ createdAt: 1 }); 

    // ✅ DATA MAPPER: Translates the DB's 'content' to the frontend's 'text'
    const formattedMessages = messages.map(msg => ({
      ...msg.toObject(), 
      text: msg.content 
    }));

    res.json(formattedMessages);
  } catch (err) {
    console.error("Fetch Messages Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- 4. SEND A MESSAGE ---
router.post('/messages/send', async (req, res) => {
  const { from, to, text } = req.body;

  try {
    const newMessage = new Message({
      sender: from,      
      recipient: to,     
      content: text      // ✅ CHANGED: Mongoose expects 'content', not 'text'
    });

    await newMessage.save();
    
    // ✅ Send back the newly saved message mapped for the frontend UI
    const savedMessage = { 
      ...newMessage.toObject(), 
      text: newMessage.content 
    };
    
    res.json(savedMessage);
  } catch (err) {
    console.error("Message Save Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;