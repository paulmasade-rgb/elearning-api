const axios = require('axios');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

const extractTextFromUrl = async (url, mimeType) => {
  try {
    // Ensure we are using a secure HTTPS connection for the download
    const secureUrl = url.replace('http://', 'https://');
    console.log(`--- Attempting Extraction from: ${secureUrl} ---`);

    const response = await axios.get(secureUrl, { 
      responseType: 'arraybuffer',
      timeout: 25000 // Increased for Nigerian network stability
    });
    
    const buffer = Buffer.from(response.data);

    if (mimeType === 'application/pdf') {
      try {
        const data = await pdf(buffer);
        return data.text || "No readable text found in PDF.";
      } catch (pdfErr) {
        console.error("PDF Parse Error:", pdfErr.message);
        return "Manual Review: PDF text extraction failed.";
      }
    } 
    
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        const data = await mammoth.extractRawText({ buffer });
        return data.value || "Word document was empty.";
      } catch (docErr) {
        console.error("Word Parse Error:", docErr.message);
        return "Manual Review: Word text extraction failed.";
      }
    }

    if (mimeType === 'text/plain') {
      return buffer.toString('utf-8');
    }

    return "Unsupported file type.";
  } catch (err) {
    console.error('Extraction Utility Error:', err.message);
    // Returning a specific error string so the AI route knows it failed
    return "Error: File content could not be retrieved for AI analysis.";
  }
};

module.exports = { extractTextFromUrl };