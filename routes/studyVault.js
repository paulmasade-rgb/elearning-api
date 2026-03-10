const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const StudyMaterial = require('../models/StudyMaterial');
const User = require('../models/User'); 
const Quiz = require('../models/Quiz'); 
const { extractTextFromBuffer } = require('../utils/textExtractor');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ Multer configured for 50MB
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } 
});

// ───────────────────────────────────────────────
//  UPLOAD + STREAM EXTRACTION (Large File Safe)
// ───────────────────────────────────────────────
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file received' });

    const { userId, title } = req.body;
    if (!userId) return res.status(400).json({ message: 'User ID required' });

    const file = req.file;

    // ✅ FIX: Using upload_stream to handle large files without crashing RAM
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { 
          folder: 'vici_study_vault', 
          resource_type: 'auto', 
          public_id: `vici_${Date.now()}` 
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(file.buffer); 
    });

    let extractedText = "Processing...";
    try {
      extractedText = await extractTextFromBuffer(file.buffer, file.mimetype);
    } catch (err) {
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

    res.status(201).json({
      success: true,
      message: "Material indexed! +50 XP",
      data: newMaterial
    });

  } catch (err) {
    console.error("UPLOAD CRASH:", err);
    res.status(500).json({ message: `Server error: ${err.message}` });
  }
});

// ───────────────────────────────────────────────
//  GENERATE STUDY MATERIAL (Customized Logic)
// ───────────────────────────────────────────────
router.post('/generate-study-material', async (req, res) => {
  try {
    const { materialId, userId, type, numQuestions, timeLimit } = req.body;

    const material = await StudyMaterial.findById(materialId);
    if (!material) return res.status(404).json({ message: "Material not found" });

    let text = material.extractedText || "";

    if (text.length < 10 || text.includes("Error:")) {
      return res.status(400).json({ 
        message: "Limited readable text extracted. Try a text-heavy PDF for best results." 
      });
    }

    // ✅ INCREASED: Increased characters to 100,000 (~50-60 pages)
    text = text.substring(0, 100000); 

    let modelConfig = { model: "gemini-1.5-flash" };
    if (type === 'quiz') {
        modelConfig = { 
            model: "gemini-2.5-flash", 
            generationConfig: { responseMimeType: "application/json" }
        };
    }
    
    const model = genAI.getGenerativeModel(modelConfig);

    let prompt = "";
    if (type === 'summary') {
      prompt = `Create a clear, structured summary in bullet points from these notes. Cover all key sections:\n\n${text}`;
    } else if (type === 'flashcards') {
      prompt = `Generate 12 useful flashcards in valid JSON array format. Each card should have "front" and "back" fields:\n\n${text}`;
    } else if (type === 'quiz') {
      const qCount = numQuestions || 10;
      prompt = `You are an expert curriculum designer. Read the following notes and generate a ${qCount}-question practice quiz. Output strictly as a valid JSON array.
      
      Requirements:
      1. Create exactly ${qCount} questions based on these notes.
      2. Mix difficulties (1, 2, and 3).
      3. Use 'single', 'multiple', 'fill', and 'match' types.
      4. Provide an 'explanation' string for every question.
      
      Structure:
      - 'single'/'multiple': { "text": "...", "type": "single", "difficulty": 1, "explanation": "...", "topicTag": "Study Vault", "options": [{ "text": "...", "isCorrect": true/false }] }
      - 'fill': { "text": "...", "type": "fill", "difficulty": 2, "explanation": "...", "topicTag": "Study Vault", "correctAnswerText": "..." }
      - 'match': { "text": "...", "type": "match", "difficulty": 3, "explanation": "...", "topicTag": "Study Vault", "options": [{ "matchLeft": "...", "matchRight": "..." }] }
      
      Notes:
      "${text}"`;
    }

    const result = await model.generateContent(prompt);
    let responseText = result.response.text();

    let returnData = responseText;

    if (type === 'flashcards') {
      returnData = responseText.replace(/```json|```/g, "").trim();
    } else if (type === 'quiz') {
      const parsedQuestions = JSON.parse(responseText.replace(/```json|```/g, "").trim());
      const vaultLessonId = `vault_${materialId}_${Date.now()}`; 
      
      const newQuiz = new Quiz({
        lessonId: vaultLessonId,
        questions: parsedQuestions,
        timeLimit: timeLimit || 0 
      });
      await newQuiz.save();
      returnData = vaultLessonId; 
    }

    if (userId) {
      await User.findByIdAndUpdate(userId, { $inc: { xp: 20 } });
    }

    res.status(200).json({ success: true, data: returnData });

  } catch (err) {
    console.error("AI GENERATION ERROR:", err);
    res.status(500).json({ message: "Failed to process large document. Try a smaller section." });
  }
});

// ... (Rest of delete/get routes remain the same)

module.exports = router;