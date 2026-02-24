const axios = require('axios');
const pdfParse = require('pdf-parse'); // ✅ Renamed to resolve naming conflict
const mammoth = require('mammoth');
const { cloudinary } = require('../config/cloudinary'); 

const extractTextFromUrl = async (url, mimeType) => {
  try {
    console.log(`--- Authenticated Extraction Started: ${url} ---`);

    // 1. Precise Public ID Extraction including folder
    const parts = url.split('/');
    const folderAndFile = parts.slice(-2).join('/'); 
    const publicId = folderAndFile.split('.')[0]; 

    let buffer;
    try {
      // 2. First Attempt: Standard resource type based on mime
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
      // 3. Fallback: Swap resource types to bypass Cloudinary categorization errors
      const fallbackUrl = cloudinary.url(publicId, {
        sign_url: true,
        resource_type: mimeType.includes('pdf') ? 'raw' : 'image',
        type: 'upload',
        secure: true
      });
      const fallbackResponse = await axios.get(fallbackUrl, { 
        responseType: 'arraybuffer',
        timeout: 20000 
      });
      buffer = Buffer.from(fallbackResponse.data);
    }

    // 4. Extraction with 15,000 character safety limit for Gemini
    if (mimeType === 'application/pdf') {
      const data = await pdfParse(buffer); 
      return data.text.replace(/\s+/g, ' ').trim().substring(0, 15000) || "Empty PDF.";
    } 
    
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const data = await mammoth.extractRawText({ buffer });
      return data.value.trim().substring(0, 15000) || "Empty Word Doc.";
    }

    return "Unsupported format.";
  } catch (err) {
    console.error('Final Extraction Failure:', err.message);
    // Returning a string prevents the 500 error on the /upload route
    return "Error: Storage retrieval failed.";
  }
};

module.exports = { extractTextFromUrl };