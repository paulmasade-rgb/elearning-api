const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  username: { type: String, required: true },
  avatar: { type: String, default: "👨‍💻" },
  title: { type: String, required: true }, // ✅ Added for the new UI
  content: { type: String, required: true },
  category: { type: String, default: "General" }, // ✅ Added for Forum filters
  flagged: { type: Boolean, default: false }, // ✅ Added for Admin moderation
  likes: { type: Array, default: [] }, // Array of usernames who liked it
  comments: [{
    username: String,
    content: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Post', PostSchema);