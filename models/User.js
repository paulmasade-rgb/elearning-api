const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },

  // --- PASSWORD RESET FIELDS ---
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // --- GAME STATS ---
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  badges: [{ type: String }], 
  completedCourses: [{ type: String }], 
  enrolledCourses: [{ type: String }], 

  // --- SOCIAL HUB ARRAYS ---
  // Stores IDs of confirmed friends
  friends: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],

  // Stores objects containing the sender's ID and the status of the request
  friendRequests: [{
    from: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    status: { 
      type: String, 
      enum: ['pending', 'accepted', 'rejected'], 
      default: 'pending' 
    }
  }]

}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);