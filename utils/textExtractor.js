const axios = require('axios');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { cloudinary } = require('../config/cloudinary'); 

const extractTextFromUrl = async (url, mimeType) => {
  try {
    console.log(`--- Authenticated Extraction Started: ${url} ---`);

    // 1. Precise Public ID Extraction
    const parts = url.split('/');
    const folderAndFile = parts.slice(-2).join('/'); 
    const publicId = folderAndFile.split('.')[0]; 

    // 2. Dual-Strategy Buffer Fetch
    let buffer;
    try {
      const signedUrl = cloudinary.url(publicId, {
        sign_url: true,
        resource_type: mimeType.includes('pdf') ? 'image' : 'raw',
        type: 'upload',
        secure: true
      });

      const response = await axios({
        method: 'get',
        url: signedUrl,
        responseType: 'arraybuffer',
        timeout: 35000 
      });
      buffer = Buffer.from(response.data);
    } catch (firstTryErr) {
      console.warn("First extraction try failed, attempting fallback...");
      // Fallback: Try the opposite resource type to bypass 404/401
      const fallbackUrl = cloudinary.url(publicId, {
        sign_url: true,
        resource_type: mimeType.includes('pdf') ? 'raw' : 'image',
        type: 'upload',
        secure: true
      });
      const fallbackResponse = await axios.get(fallbackUrl, { responseType: 'arraybuffer' });
      buffer = Buffer.from(fallbackResponse.data);
    }

    // 3. Extraction with 15k limit for Gemini stability
    if (mimeType === 'application/pdf') {
      const data = await pdf(buffer);
      return data.text.replace(/\s+/g, ' ').trim().substring(0, 15000) || "Empty PDF.";
    } 
    
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const data = await mammoth.extractRawText({ buffer });
      return data.value.trim().substring(0, 15000) || "Empty Word Doc.";
    }

    return "Unsupported format.";
  } catch (err) {
    console.error('Final Extraction Failure:', err.message);
    return "Error: Storage retrieval failed.";
  }
};

module.exports = { extractTextFromUrl };