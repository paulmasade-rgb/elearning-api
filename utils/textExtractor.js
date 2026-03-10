const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const extractTextFromBuffer = async (buffer, mimeType) => {
  try {
    console.log(`--- Buffer Extraction | Type: ${mimeType} | Size: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB ---`);

    // 🔥 AI OCR Helper with Payload Guardrail
    const useGeminiOCR = async (buf, mime) => {
      if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
      
      // ⚠️ IMPORTANT: Gemini inlineData has a limit. 
      // If the file is > 15MB, we take a slice to avoid a 413 error.
      const safetyBuffer = buf.length > 15 * 1024 * 1024 ? buf.slice(0, 15 * 1024 * 1024) : buf;
      
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = "Extract all readable text from this document. Return only the text. If it's a large book, extract the core concepts and index.";
      
      const result = await model.generateContent([
        prompt,
        { inlineData: { data: safetyBuffer.toString("base64"), mimeType: mime } }
      ]);
      return result.response.text();
    };

    // 📄 PDF HANDLING (Most common for 50MB files)
    if (mimeType === 'application/pdf') {
      // pdf-parse is generally fast even for large files
      const data = await pdf(buffer);
      let text = data.text.replace(/\s+/g, ' ').trim();

      // If it's a scanned PDF (no selectable text found)
      if (text.length < 100) {
        console.log("PDF appears to be scanned. Initiating AI OCR on first 15MB...");
        try {
          text = await useGeminiOCR(buffer, mimeType);
        } catch (aiErr) {
          console.error("AI OCR Failed:", aiErr.message);
        }
      }
      return text.substring(0, 100000) || "No readable text found in PDF.";
    }

    // 📝 WORD HANDLING
    if (mimeType.includes('wordprocessingml') || mimeType === 'application/msword') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value.trim().substring(0, 100000) || "Empty Word document.";
    }

    // 📊 EXCEL HANDLING
    if (mimeType.includes('spreadsheetml') || mimeType === 'application/vnd.ms-excel') {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let text = '';
      workbook.SheetNames.forEach(name => {
        text += XLSX.utils.sheet_to_txt(workbook.Sheets[name]) + '\n';
      });
      return text.trim().substring(0, 100000);
    }

    // 🖼️ IMAGE HANDLING
    if (mimeType.startsWith('image/')) {
      try {
        const text = await useGeminiOCR(buffer, mimeType);
        return text.substring(0, 100000);
      } catch (aiErr) {
        return "Image OCR failed. Check file size or API key.";
      }
    }

    // 📽️ POWERPOINT (Simple Text Extraction)
    if (mimeType.includes('presentationml')) {
      return "PowerPoint files contain complex structures. For best results, save as PDF and upload again.";
    }

    // 🔤 PLAIN TEXT
    if (mimeType.startsWith('text/')) {
      return buffer.toString('utf-8').trim().substring(0, 100000);
    }

    return "Unsupported file type for extraction.";
  } catch (err) {
    console.error('Buffer Extraction Error:', err.message);
    return `Error: ${err.message}`;
  }
};

module.exports = { extractTextFromBuffer };