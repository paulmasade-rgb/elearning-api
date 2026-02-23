const axios = require('axios');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

const extractTextFromUrl = async (url, mimeType) => {
  try {
    // 1. Force HTTPS and ensure the URL is clean
    const secureUrl = url.replace('http://', 'https://');
    console.log(`--- Initiating Secure Extraction: ${secureUrl} ---`);

    // 2. Use a full request config to bypass Cloudinary's 401/Bot detection
    const response = await axios({
      method: 'get',
      url: secureUrl,
      responseType: 'arraybuffer',
      headers: {
        'Accept': 'application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain',
        'User-Agent': 'ViciAcademicEngine/1.0 (Educational Tool)', 
      },
      timeout: 30000 // 30s for slower connectivity
    });
    
    const buffer = Buffer.from(response.data);

    // 3. Robust Extraction Logic with Character Trimming
    if (mimeType === 'application/pdf') {
      try {
        const data = await pdf(buffer);
        // Clean and trim to prevent 429/500 errors on large files
        const cleanText = data.text.replace(/\s+/g, ' ').trim();
        return cleanText.substring(0, 15000) || "PDF was successfully read but contained no text.";
      } catch (pdfErr) {
        console.error("PDF Parsing Library Error:", pdfErr.message);
        return "Error: PDF extraction failed.";
      }
    } 
    
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        const data = await mammoth.extractRawText({ buffer });
        // Trim for token safety
        return data.value.trim().substring(0, 15000) || "Word document was empty.";
      } catch (docErr) {
        console.error("Word Doc Library Error:", docErr.message);
        return "Error: Word extraction failed.";
      }
    }

    if (mimeType === 'text/plain') {
      return buffer.toString('utf-8').trim().substring(0, 15000);
    }

    return "Unsupported format for text analysis.";
  } catch (err) {
    // Precise logging for the 401 or other network errors
    console.error('Extraction Failure Details:', {
      statusCode: err.response?.status,
      message: err.message
    });
    
    // Returning a string instead of throwing prevents the 500 server crash
    return "Error: Storage security blocked content retrieval for AI.";
  }
};

module.exports = { extractTextFromUrl };