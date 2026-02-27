const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  role: { 
    type: String, 
    enum: ['student', 'scholar', 'instructor', 'admin'], 
    default: 'scholar' 
  },

  // --- IDENTITY ---
  avatar: { type: String, default: "👤" }, // Universal icon
  major: { type: String, default: "Lifelong Learner" }, 
  academicLevel: { type: String, default: "Explorer" }, 

  // --- GAME STATS ---
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  badges: [{ type: String }], 
  completedCourses: [{ type: String }], 
  enrolledCourses: [{ type: String }], 

  // ✅ UNIVERSAL MISSIONS (Accomplishments)
  missions: [{
    missionId: { type: String, default: () => Math.random().toString(36).substr(2, 9) },
    lessonTitle: { type: String },
    moduleName: { type: String },
    submission: { type: String },
    date: { type: Date, default: Date.now },
    likes: [{ type: String }] 
  }],

  // --- SOCIAL ---
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
  }],

  // --- AUTH RECOVERY ---
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },

  // --- GAMIFICATION TRACKING ---
  currentStreak: { type: Number, default: 0 },
  lastActiveDate: { type: String, default: null }, 
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