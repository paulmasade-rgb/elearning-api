const mongoose = require('mongoose');

const StudyMaterialSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Links the note to the specific student
    required: true
  },
  title: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String, // The Cloudinary URL for the PDF/Doc
    required: true
  },
  fileType: {
    type: String // e.g., 'application/pdf'
  },
  publicId: {
    type: String // Used to manage/delete the file on Cloudinary
  },
  category: {
    type: String,
    default: 'General Study' // e.g., 'Computer Science', 'Accounting'
  },
  extractedText: {
    type: String // ✅ THE BRAIN: Stores the raw text for Gemini AI
  },
  summary: {
    type: String // Future: AI-generated summary for quick review
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('StudyMaterial', StudyMaterialSchema);