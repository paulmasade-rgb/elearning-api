const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  username: { type: String, required: true },
  avatar: { type: String, default: "👨‍💻" },
  content: { type: String, required: true },
  likes: { type: Array, default: [] }, // Array of usernames who liked it
  comments: [{
    username: String,
    content: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Post', PostSchema);