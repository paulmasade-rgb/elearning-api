const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  // ✅ Roles for access control
  role: { 
    type: String, 
    enum: ['student', 'scholar', 'instructor', 'admin'], 
    default: 'scholar' 
  },

  // --- IDENTITY ---
  avatar: { type: String, default: "👨‍💻" },
  major: { type: String, default: "Independent Learner" }, 
  academicLevel: { type: String, default: "Beginner" }, 

  // --- GAME STATS ---
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  badges: [{ type: String }], 
  completedCourses: [{ type: String }], 
  enrolledCourses: [{ type: String }], 

  // --- SOCIAL ---
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
  }],

  // --- AUTH RECOVERY ---
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },

  // ✅ REAL GAMIFICATION TRACKING
  currentStreak: { type: Number, default: 0 },
  lastActiveDate: { type: String, default: null }, // Stored as YYYY-MM-DD
  weeklyActivity: { 
    type: Array, 
    default: [
      { day: 'Mon', xp: 0 }, { day: 'Tue', xp: 0 }, { day: 'Wed', xp: 0 },
      { day: 'Thu', xp: 0 }, { day: 'Fri', xp: 0 }, { day: 'Sat', xp: 0 }, { day: 'Sun', xp: 0 }
    ] 
  },
  isBanned: { type: Boolean, default: false }

}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);