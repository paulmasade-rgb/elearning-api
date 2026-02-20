const mongoose = require('mongoose');

const OptionSchema = new mongoose.Schema({
  text: { type: String },
  isCorrect: { type: Boolean, default: false },
  matchLeft: { type: String }, // Used for 'match' type (e.g., "Mitochondria")
  matchRight: { type: String } // Used for 'match' type (e.g., "Powerhouse")
});

const QuestionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['single', 'multiple', 'fill', 'match'], 
    required: true 
  },
  difficulty: { type: Number, required: true, min: 1, max: 3 }, // 1=Easy, 2=Medium, 3=Hard
  options: [OptionSchema], // Used for 'single', 'multiple', and 'match'
  correctAnswerText: { type: String }, // Used ONLY for 'fill' in the blank
  explanation: { type: String } // Shown after they finally get it right
});

const QuizSchema = new mongoose.Schema({
  lessonId: { type: String, required: true }, // Links to your lesson/course
  questions: [QuestionSchema]
}, { timestamps: true });

module.exports = mongoose.model('Quiz', QuizSchema);