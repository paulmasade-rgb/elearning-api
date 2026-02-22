const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const StudyMaterial = require('../models/StudyMaterial');
const User = require('../models/User'); // ✅ Import User model for XP updates
const { extractTextFromUrl } = require('../utils/textExtractor');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- 1. UPLOAD & INDEX MATERIAL (WITH XP REWARD) ---
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const { userId, title, courseCategory } = req.body;

    console.log('--- STARTING TEXT EXTRACTION ---');
    const extractedText = await extractTextFromUrl(req.file.path, req.file.mimetype);

    const newMaterial = new StudyMaterial({
      user: userId,
      title: title || req.file.originalname,
      fileUrl: req.file.path,
      fileType: req.file.mimetype,
      publicId: req.file.filename,
      category: courseCategory || 'General Study',
      extractedText: extractedText 
    });

    await newMaterial.save();

    // ✅ GAMIFICATION: Reward the user with 50 XP for "Feeding the Brain"
    const xpReward = 50;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { xp: xpReward } },
      { new: true }
    );

    res.status(201).json({
      success: true,
      message: `Material indexed! You earned ${xpReward} XP.`,
      data: newMaterial,
      newTotalXp: updatedUser ? updatedUser.xp : null
    });

  } catch (err) {
    console.error('Upload/Extraction Error:', err.message);
    res.status(500).json({ message: 'Server error during processing' });
  }
});

// --- 2. GENERATE AI STUDY CONTENT ---
router.post('/generate-study-material', async (req, res) => {
  try {
    const { materialId, userId, type, count = 10 } = req.body; 

    const material = await StudyMaterial.findById(materialId);
    if (!material) return res.status(404).json({ message: "Note not found" });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let prompt = "";
    if (type === 'summary') {
      prompt = `Summarize these notes into exactly ${count} informative bullet points: \n\n ${material.extractedText}`;
    } else if (type === 'flashcards') {
      prompt = `Generate ${count} flashcards as a JSON array with "question" and "answer" keys: \n\n ${material.extractedText}`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // ✅ GAMIFICATION: Reward 20 XP for engaging with the AI
    if (userId) {
      await User.findByIdAndUpdate(userId, { $inc: { xp: 20 } });
    }

    res.status(200).json({
      success: true,
      data: text,
      message: "Study material generated! +20 XP earned."
    });

  } catch (err) {
    res.status(500).json({ message: "AI generation failed." });
  }
});

router.get('/user/:userId', async (req, res) => {
  try {
    const materials = await StudyMaterial.find({ user: req.params.userId }).sort({ createdAt: -1 });
    res.status(200).json(materials);
  } catch (err) {
    res.status(500).json({ message: "Could not retrieve library." });
  }
});

module.exports = router;