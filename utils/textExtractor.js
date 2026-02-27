const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const extractTextFromBuffer = async (buffer, mimeType) => {
  try {
    console.log(`--- Buffer Extraction | Type: ${mimeType} | Size: ${buffer.length} bytes ---`);

    // 🔥 NEW: AI OCR Helper using Gemini
    const useGeminiOCR = async (buf, mime) => {
      if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = "Extract all readable text from this document or image. Return only the exact extracted text. Do not add formatting. If there is absolutely no readable text, return exactly: 'No readable text found.'";
      
      const result = await model.generateContent([
        prompt,
        { inlineData: { data: buf.toString("base64"), mimeType: mime } }
      ]);
      return result.response.text();
    };

    // 📄 PDF HANDLING
    if (mimeType === 'application/pdf') {
      const data = await pdf(buffer);
      let text = data.text.replace(/\s+/g, ' ').trim();

      // If pdf-parse finds barely any text, it's likely a scanned PDF. Fallback to AI!
      if (text.length < 50) {
        console.log("PDF appears to be scanned or empty. Initiating AI OCR...");
        try {
          text = await useGeminiOCR(buffer, mimeType);
        } catch (aiErr) {
          console.error("AI OCR Failed:", aiErr.message);
        }
      }
      return text.substring(0, 30000) || "No readable text found in PDF.";
    }

    // 📝 WORD HANDLING
    if (mimeType.includes('wordprocessingml') || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value.trim().substring(0, 30000) || "Empty Word document.";
    }

    // 📊 EXCEL HANDLING
    if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let text = '';
      workbook.SheetNames.forEach(sheetName => {
        const sheet = XLSX.utils.sheet_to_txt(workbook.Sheets[sheetName]);
        text += sheet + '\n\n';
      });
      return text.trim().substring(0, 30000) || "No readable text in Excel.";
    }

    // 🖼️ IMAGE HANDLING (Now supports AI Extraction!)
    if (mimeType.startsWith('image/')) {
      console.log("Image detected. Initiating AI OCR...");
      try {
        const text = await useGeminiOCR(buffer, mimeType);
        return text.substring(0, 30000);
      } catch (aiErr) {
        console.error("Image OCR Failed:", aiErr.message);
        return "Image detected, but AI extraction failed. Make sure your Gemini API key is valid.";
      }
    }

    // 📽️ POWERPOINT
    if (mimeType.includes('presentationml') || mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      return "PowerPoint detected. Limited text extraction. Upload PDF version for better AI results.";
    }

    // 🔤 PLAIN TEXT
    if (mimeType.startsWith('text/') || mimeType === 'application/txt') {
      return buffer.toString('utf-8').trim().substring(0, 30000);
    }

    // 🎥 VIDEO
    if (mimeType.startsWith('video/')) {
      return "Video detected — no text extractable. Upload lecture notes PDF for summarization/flashcards.";
    }

    return "Unsupported file type for text extraction.";
  } catch (err) {
    console.error('Buffer Extraction Error:', err.message);
    return `Error: ${err.message}`;
  }
};

module.exports = { extractTextFromBuffer };