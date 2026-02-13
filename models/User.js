const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },

  // --- PASSWORD RESET FIELDS ---
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // --- GAME STATS (Only for students) ---
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  badges: [{ type: String }], // Array of badge names like ["Early Bird"]
  completedCourses: [{ type: String }], // Array of Course IDs
  
  // ✅ NEW: Tracks which courses the student has actively added to their backpack
  enrolledCourses: [{ type: String }], 

  // --- NEW SOCIAL FEATURES ---
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
  }]
  // ---------------------------

}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);