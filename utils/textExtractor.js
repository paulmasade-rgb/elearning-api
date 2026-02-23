const axios = require('axios');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { cloudinary } = require('../config/cloudinary'); 

const extractTextFromUrl = async (url, mimeType) => {
  try {
    console.log(`--- Authenticated Extraction: ${url} ---`);

    // 1. Precise Public ID Extraction
    const parts = url.split('/');
    const folderAndFile = parts.slice(-2).join('/'); 
    const publicId = folderAndFile.split('.')[0]; 

    // 2. Generate a Signed URL using 'image' type
    // Cloudinary categorizes PDFs as 'image' resource_type by default
    const signedUrl = cloudinary.url(publicId, {
      sign_url: true,
      resource_type: 'image', // ✅ Changed from 'raw' to 'image' to fix 404
      secure: true
    });

    console.log(`🔍 Signed URL Generated for ID: ${publicId}`);

    // 3. Download with a high-performance timeout
    const response = await axios({
      method: 'get',
      url: signedUrl,
      responseType: 'arraybuffer',
      timeout: 35000 
    });
    
    const buffer = Buffer.from(response.data);

    // 4. Extraction & 15k Character Limit for Gemini
    if (mimeType === 'application/pdf') {
      const data = await pdf(buffer);
      const cleanText = data.text.replace(/\s+/g, ' ').trim();
      return cleanText.substring(0, 15000) || "Empty PDF.";
    } 
    
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const data = await mammoth.extractRawText({ buffer });
      return data.value.trim().substring(0, 15000) || "Empty Word Doc.";
    }

    return "Unsupported format.";
  } catch (err) {
    // If 'image' fails, we log the specific reason to differentiate 401 from 404
    console.error('Extraction Failure:', {
      message: err.message,
      status: err.response?.status
    });
    return "Error: Storage retrieval failed.";
  }
};

module.exports = { extractTextFromUrl };