const axios = require('axios');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { cloudinary } = require('../config/cloudinary'); 

const extractTextFromUrl = async (url, mimeType) => {
  try {
    console.log(`--- Starting Extraction for ${mimeType} --- URL: ${url}`);

    // Extract public_id correctly (vici_study_vault/filename)
    const urlParts = url.split('/');
    const publicId = urlParts.slice(-2).join('/').split('.')[0]; 

    console.log(`Public ID extracted: ${publicId}`);

    // ✅ FIXED: PDF and Word docs must use 'raw' resource_type
    const resourceType = (mimeType.includes('pdf') || mimeType.includes('word')) ? 'raw' : 'image';

    const signedUrl = cloudinary.url(publicId, {
      sign_url: true,
      resource_type: resourceType,
      type: 'upload',
      secure: true,
      expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour
    });

    console.log(`Signed URL generated for ${resourceType}`);

    const response = await axios.get(signedUrl, { 
      responseType: 'arraybuffer', 
      timeout: 30000 
    });

    const buffer = Buffer.from(response.data);

    console.log(`Downloaded buffer size: ${buffer.length} bytes`);

    if (buffer.length < 500) {
      return "Error: File download returned empty or restricted data.";
    }

    if (mimeType === 'application/pdf') {
      const data = await pdf(buffer);
      const cleanText = data.text.replace(/\s+/g, ' ').trim();
      return cleanText.substring(0, 15000) || "Error: No text found in PDF.";
    } 

    if (mimeType.includes('word')) {
      const data = await mammoth.extractRawText({ buffer });
      return data.value.trim().substring(0, 15000) || "Error: Word doc was empty.";
    }

    return "Error: Unsupported format.";
  } catch (err) {
    console.error('Extraction Failure:', err.message);
    return `Error: ${err.message}`;
  }
};

module.exports = { extractTextFromUrl };