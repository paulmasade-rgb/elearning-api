const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  module: { type: String, required: true },
  xp: { type: Number, default: 100 },
  videoId: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Course', CourseSchema);