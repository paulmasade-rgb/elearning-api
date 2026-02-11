const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  username: { type: String, required: true },
  avatar: { type: String, default: "👨‍💻" },
  action: { type: String, required: true }, // e.g., "completed a lesson"
  detail: { type: String }, // e.g., "Intro to Software Engineering"
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Activity', ActivitySchema);