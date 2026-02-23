const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const StudyMaterial = require('../models/StudyMaterial');
const User = require('../models/User'); 
const { extractTextFromUrl } = require('../utils/textExtractor');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- 1. UPLOAD & INDEX MATERIAL ---
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    console.log("--- New Upload Request Received ---");
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file received.' });
    }

    const { userId, title, courseCategory } = req.body;
    if (!userId) return res.status(400).json({ message: 'User ID required.' });

    console.log(`📂 Processing: ${req.file.originalname}`);

    let extractedText = "Processing...";
    try {
      extractedText = await extractTextFromUrl(req.file.path, req.file.mimetype);
    } catch (extErr) {
      console.error("⚠️ Extraction failed:", extErr.message);
      extractedText = "Error: Content unreadable.";
    }

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

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { xp: 50 } },
      { new: true }
    );

    console.log(`✅ Upload Success. XP: ${updatedUser?.xp}`);

    res.status(201).json({
      success: true,
      message: `Material indexed! +50 XP earned.`,
      data: newMaterial,
      newTotalXp: updatedUser ? updatedUser.xp : null
    });

  } catch (err) {
    console.error('SERVER UPLOAD ERROR:', err.message);
    res.status(500).json({ message: `Server error: ${err.message}` });
  }
});

// --- 2. GENERATE AI CONTENT ---
router.post('/generate-study-material', async (req, res) => {
  try {
    const { materialId, userId, type, count = 10 } = req.body; 

    const material = await StudyMaterial.findById(materialId);
    if (!material) return res.status(404).json({ message: "Note not found" });

    // Stop if extraction failed
    if (material.extractedText.includes("Error:") || material.extractedText.length < 10) {
      return res.status(400).json({ message: "This file has no readable text for the AI to analyze." });
    }

    // ✅ Switched to 1.5-flash to resolve your specific 429 quota error
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let prompt = (type === 'summary') 
      ? `Summarize these notes into ${count} bullet points: \n\n ${material.extractedText}`
      : `Generate ${count} flashcards from these notes as a JSON array: \n\n ${material.extractedText}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().replace(/```json|```/g, "").trim();

    if (userId) await User.findByIdAndUpdate(userId, { $inc: { xp: 20 } });

    res.status(200).json({ success: true, data: text });
  } catch (err) {
    console.error('AI GENERATION ERROR:', err.message);
    // Friendly error for quota issues
    const errorMessage = err.message.includes('429') 
      ? "AI is taking a breather (Quota exceeded). Please try again in 1 minute." 
      : "AI generation failed.";
    res.status(500).json({ message: errorMessage });
  }
});

router.get('/user/:userId', async (req, res) => {
  try {
    const materials = await StudyMaterial.find({ user: req.params.userId }).sort({ createdAt: -1 });
    res.status(200).json(materials);
  } catch (err) {
    res.status(500).json({ message: "Library unavailable." });
  }
});

module.exports = router;