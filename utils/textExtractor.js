// utils/textExtractor.js
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx'); // Add to package.json if missing: npm install xlsx

const extractTextFromBuffer = async (buffer, mimeType) => {
  try {
    console.log(`--- Buffer Extraction Started | Type: ${mimeType} | Size: ${buffer.length} bytes ---`);

    if (mimeType === 'application/pdf') {
      const data = await pdf(buffer);
      const text = data.text.replace(/\s+/g, ' ').trim();
      return text.substring(0, 30000) || "No readable text in PDF.";
    }

    if (mimeType.includes('wordprocessingml') || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value.trim().substring(0, 30000) || "Empty Word document.";
    }

    if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let text = '';
      workbook.SheetNames.forEach(sheetName => {
        const sheet = XLSX.utils.sheet_to_txt(workbook.Sheets[sheetName]);
        text += sheet + '\n\n';
      });
      return text.trim().substring(0, 30000) || "No readable text in Excel.";
    }

    if (mimeType.includes('presentationml') || mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      // PPTX extraction is limited — return placeholder
      return "PowerPoint detected. Text extraction limited. Consider converting to PDF for best AI results.";
    }

    if (mimeType.startsWith('text/') || mimeType === 'application/txt') {
      return buffer.toString('utf-8').trim().substring(0, 30000);
    }

    if (mimeType.startsWith('image/')) {
      return "Image detected — no text extractable. Upload lecture notes PDF for summarization/flashcards.";
    }

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