const router = require('express').Router();
const Message = require('../models/Message');

// SEND MESSAGE
router.post('/', async (req, res) => {
  try {
    const newMessage = new Message(req.body);
    const savedMessage = await newMessage.save();
    res.status(200).json(savedMessage);
  } catch (err) {
    res.status(500).json(err);
  }
});

// GET CONVERSATION
router.get('/:convId', async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.convId
    }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;