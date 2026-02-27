const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// 👇 ADDED: Cloudinary configuration to authorize deletions
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const StudyMaterial = require('../models/StudyMaterial');
const User = require('../models/User'); 
const { extractTextFromBuffer } = require('../utils/textExtractor');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Memory storage — best for buffer extraction
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// ───────────────────────────────────────────────
//  UPLOAD + BUFFER EXTRACTION
// ───────────────────────────────────────────────
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    console.log("=== UPLOAD STARTED ===");
    if (!req.file) return res.status(400).json({ message: 'No file received' });

    const { userId, title } = req.body;
    if (!userId) return res.status(400).json({ message: 'User ID required' });

    const file = req.file;
    console.log(`File: ${file.originalname} | Type: ${file.mimetype} | Size: ${file.size} bytes`);

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(
      `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
      {
        folder: 'vici_study_vault',
        resource_type: 'auto',
        public_id: `vici_${Date.now()}`
      }
    );

    console.log("Uploaded to Cloudinary:", uploadResult.secure_url);

    // Extract text from buffer
    let extractedText = "Processing...";
    try {
      extractedText = await extractTextFromBuffer(file.buffer, file.mimetype);
      console.log(`Buffer extraction successful: ${extractedText.length} characters`);
    } catch (err) {
      console.error("Extraction failed:", err.message);
      extractedText = `Error: ${err.message}`;
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
    res.status(201).json({
      success: true,
      message: "Material indexed! +50 XP",
      data: newMaterial
    });

  } catch (err) {
    console.error("UPLOAD CRASH:", err.message, err.stack);
    res.status(500).json({ message: `Server error: ${err.message}` });
  }
});

// ───────────────────────────────────────────────
//  GENERATE STUDY MATERIAL (summary / flashcards)
// ───────────────────────────────────────────────
router.post('/generate-study-material', async (req, res) => {
  try {
    const { materialId, userId, type } = req.body;

    const material = await StudyMaterial.findById(materialId);
    if (!material) return res.status(404).json({ message: "Material not found" });

    let text = material.extractedText || "";

    // Relaxed check — allow very short text for PPTX/slides
    if (text.length < 10 || text.includes("Error:")) {
      return res.status(400).json({ 
        message: "Limited readable text extracted. Try a text-heavy PDF for best results." 
      });
    }

    text = text.substring(0, 25000);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = type === 'summary' 
      ? `Create a clear, structured summary in bullet points from these notes:\n\n${text}`
      : `Generate 8–12 useful flashcards in valid JSON array format. Each card should have "front" and "back" fields:\n\n${text}`;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text();

    if (type === 'flashcards') {
      responseText = responseText.replace(/```json|```/g, "").trim();
    }

    if (userId) {
      await User.findByIdAndUpdate(userId, { $inc: { xp: 20 } });
    }

    res.status(200).json({ success: true, data: responseText });

  } catch (err) {
    console.error("AI GENERATION ERROR:", err.message, err.stack);
    res.status(500).json({ 
      message: "Failed to generate content. The document may be too large or complex." 
    });
  }
});

// ───────────────────────────────────────────────
//  DELETE MATERIAL (Cloudinary + MongoDB)
// ───────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const material = await StudyMaterial.findById(req.params.id);
    if (!material) return res.status(404).json({ message: "Material not found" });

    // Delete from Cloudinary if publicId exists
    if (material.publicId) {
      try {
        await cloudinary.uploader.destroy(material.publicId);
        console.log("Deleted from Cloudinary:", material.publicId);
      } catch (cloudErr) {
        console.error("Cloudinary delete issue (proceeding to DB delete):", cloudErr.message);
      }
    }

    // Delete from DB
    await StudyMaterial.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: "Material deleted successfully" });
  } catch (err) {
    console.error("DELETE ERROR:", err.message, err.stack);
    res.status(500).json({ message: `Delete failed: ${err.message}` });
  }
});

// ───────────────────────────────────────────────
//  GET USER'S MATERIALS (History)
// ───────────────────────────────────────────────
router.get('/user/:userId', async (req, res) => {
  try {
    const materials = await StudyMaterial.find({ user: req.params.userId })
      .sort({ createdAt: -1 }); // newest first
    res.status(200).json(materials);
  } catch (err) {
    console.error("GET LIBRARY ERROR:", err);
    res.status(500).json({ message: "Could not fetch materials" });
  }
});

module.exports = router;