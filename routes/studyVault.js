const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const StudyMaterial = require('../models/StudyMaterial');
const User = require('../models/User'); 
const { extractTextFromUrl } = require('../utils/textExtractor');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Cloudinary Config (already in your .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer with memory storage (most reliable for extraction)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } 
});

// ===============================================
// UPLOAD + TEXT EXTRACTION (supports PDF, DOCX, TXT, PPTX, XLSX, images)
// ===============================================
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    console.log("=== UPLOAD STARTED ===");
    if (!req.file) return res.status(400).json({ message: 'No file received' });

    const { userId, title } = req.body;
    if (!userId) return res.status(400).json({ message: 'User ID required' });

    const file = req.file;
    console.log(`File received: ${file.originalname} | Type: ${file.mimetype} | Size: ${file.size} bytes`);

    // Determine resource type for Cloudinary
    let resourceType = 'raw';
    if (file.mimetype.startsWith('image/')) resourceType = 'image';
    else if (file.mimetype.startsWith('video/')) resourceType = 'video';

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(
      `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
      {
        folder: 'vici_study_vault',
        resource_type: resourceType,
        public_id: `vici_${Date.now()}`
      }
    );

    console.log("✅ Uploaded to Cloudinary:", uploadResult.secure_url);

    // Extract text from buffer (now reliable)
    let extractedText = "Processing...";
    try {
      extractedText = await extractTextFromUrl(uploadResult.secure_url, file.mimetype);
      console.log(`✅ Text extracted: ${extractedText.length} characters`);
    } catch (e) {
      console.error("Extraction error:", e.message);
      extractedText = `Error: ${e.message}`;
    }

    const newMaterial = new StudyMaterial({
      user: userId,
      title: title || file.originalname,
      fileUrl: uploadResult.secure_url,
      fileType: file.mimetype,
      publicId: uploadResult.public_id,
      extractedText
    });

    await newMaterial.save();
    await User.findByIdAndUpdate(userId, { $inc: { xp: 50 } });

    console.log("=== UPLOAD SUCCESS ===");
    res.status(201).json({ success: true, message: "Material indexed! +50 XP", data: newMaterial });

  } catch (err) {
    console.error("UPLOAD CRASH:", err);
    res.status(500).json({ message: err.message });
  }
});

// ===============================================
// GENERATE AI (summary / flashcards)
// ===============================================
router.post('/generate-study-material', async (req, res) => {
  try {
    const { materialId, userId, type } = req.body;

    const material = await StudyMaterial.findById(materialId);
    if (!material) return res.status(404).json({ message: "Note not found" });

    if (material.extractedText.length < 50 || material.extractedText.includes("Error:")) {
      return res.status(400).json({ message: "No readable text. Re-upload a clear file." });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = type === 'summary' 
      ? `Summarize these notes in clear bullet points:\n\n${material.extractedText}`
      : `Generate 10 useful flashcards as valid JSON array from this content:\n\n${material.extractedText}`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().replace(/```json|```/g, "").trim();

    if (userId) await User.findByIdAndUpdate(userId, { $inc: { xp: 20 } });

    res.status(200).json({ success: true, data: text });
  } catch (err) {
    console.error('AI Error:', err);
    res.status(500).json({ message: "AI generation failed" });
  }
});

// GET USER LIBRARY
router.get('/user/:userId', async (req, res) => {
  try {
    const materials = await StudyMaterial.find({ user: req.params.userId }).sort({ createdAt: -1 });
    res.status(200).json(materials);
  } catch (err) {
    res.status(500).json({ message: "Library unavailable." });
  }
});

module.exports = router;