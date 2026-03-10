const mongoose = require('mongoose');

const ContentBlockSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['text', 'video', 'flashcard', 'code'], 
    required: true 
  },
  data: mongoose.Schema.Types.Mixed 
  /* If text: { content: "Markdown text here" }
    If video: { videoId: "youtube_id" }
    If flashcard: { front: "Question", back: "Answer" }
  */
});

const PageSchema = new mongoose.Schema({
  pageNumber: { type: String }, // e.g., "1.1.1"
  title: { type: String },
  topicTag: { type: String }, // e.g., "Subnetting" (Used for quiz analytics later)
  contentBlocks: [ContentBlockSchema]
});

const ChapterSchema = new mongoose.Schema({
  chapterNumber: { type: String }, // e.g., "1.1"
  title: { type: String },
  pages: [PageSchema]
});

const ModuleSchema = new mongoose.Schema({
  moduleNumber: { type: String }, // e.g., "1.0"
  title: { type: String },
  chapters: [ChapterSchema]
});

const CourseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  xpReward: { type: Number, default: 500 },
  modules: [ModuleSchema]
}, { timestamps: true });

module.exports = mongoose.model('Course', CourseSchema);