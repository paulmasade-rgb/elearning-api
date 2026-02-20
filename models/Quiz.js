const mongoose = require('mongoose');

const OptionSchema = new mongoose.Schema({
  text: { type: String }, 
  isCorrect: { type: Boolean },
  matchLeft: { type: String }, // Required for your 'match' type
  matchRight: { type: String } // Required for your 'match' type
});

const QuestionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, required: true }, // Removed strict enum so 'single', 'multiple', 'match', 'fill' all pass
  options: [OptionSchema], 
  answer: { type: String }, 
  correctAnswerText: { type: String }, // Required for your 'fill' type
  explanation: { type: String },
  difficulty: { type: Number, required: true }
});

const QuizSchema = new mongoose.Schema({
  lessonId: { type: String, required: true, unique: true },
  questions: [QuestionSchema]
}, { timestamps: true });

module.exports = mongoose.model('Quiz', QuizSchema);