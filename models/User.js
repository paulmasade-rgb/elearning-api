const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  // ✅ UPDATED: Roles expanded and default set to 'scholar'
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
  }]
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);