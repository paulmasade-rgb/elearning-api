const axios = require('axios');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

const extractTextFromUrl = async (url, mimeType) => {
  try {
    // 1. Download the file as a buffer with a timeout for stability
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
    const buffer = Buffer.from(response.data);

    // 2. Parse based on file type with internal safety checks
    if (mimeType === 'application/pdf') {
      try {
        const data = await pdf(buffer);
        return data.text || "No readable text found in this PDF.";
      } catch (pdfErr) {
        console.error("PDF Parsing failed:", pdfErr.message);
        return "Manual Review Required: PDF extraction failed.";
      }
    } 
    
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        const data = await mammoth.extractRawText({ buffer });
        return data.value || "No readable text found in this Word document.";
      } catch (docErr) {
        console.error("Word Doc Parsing failed:", docErr.message);
        return "Manual Review Required: Word extraction failed.";
      }
    }

    if (mimeType === 'text/plain') {
      return buffer.toString('utf-8');
    }

    return "Unsupported file type for automated extraction.";
  } catch (err) {
    console.error('Extraction Utility Error:', err.message);
    return "The system could not retrieve the file for extraction.";
  }
};

module.exports = { extractTextFromUrl };