const axios = require('axios');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { cloudinary } = require('../config/cloudinary'); // ✅ Import your existing config

const extractTextFromUrl = async (url, mimeType) => {
  try {
    console.log(`--- Initiating Authenticated Extraction: ${url} ---`);

    // 1. Instead of a public fetch, we generate a SIGNED URL using the SDK
    // This bypasses 401 errors because it includes a security signature
    const publicId = url.split('/').pop().split('.')[0]; 
    const signedUrl = cloudinary.url(publicId, {
      resource_type: 'raw',
      secure: true,
      sign_url: true // ✅ Key to bypassing security blocks
    });

    // 2. Download the file using the signed URL
    const response = await axios({
      method: 'get',
      url: signedUrl,
      responseType: 'arraybuffer',
      timeout: 30000 
    });
    
    const buffer = Buffer.from(response.data);

    // 3. Extraction Logic (with 15k character safety for Gemini quota)
    if (mimeType === 'application/pdf') {
      try {
        const data = await pdf(buffer);
        const cleanText = data.text.replace(/\s+/g, ' ').trim();
        return cleanText.substring(0, 15000) || "PDF contained no readable text.";
      } catch (pdfErr) {
        return "Error: PDF parsing failed.";
      }
    } 
    
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        const data = await mammoth.extractRawText({ buffer });
        return data.value.trim().substring(0, 15000) || "Word document was empty.";
      } catch (docErr) {
        return "Error: Word extraction failed.";
      }
    }

    if (mimeType === 'text/plain') {
      return buffer.toString('utf-8').trim().substring(0, 15000);
    }

    return "Unsupported format.";
  } catch (err) {
    console.error('Extraction Failure:', err.message);
    return "Error: Storage security blocked content retrieval.";
  }
};

module.exports = { extractTextFromUrl };