const axios = require('axios');
const pdf = require('pdf-parse'); // ✅ Direct import for function call
const mammoth = require('mammoth');
const { cloudinary } = require('../config/cloudinary'); 

const extractTextFromUrl = async (url, mimeType) => {
  try {
    console.log(`--- Authenticated Extraction Started: ${url} ---`);

    const parts = url.split('/');
    const folderAndFile = parts.slice(-2).join('/'); 
    const publicId = folderAndFile.split('.')[0]; 

    // Generate Signed URL to bypass Cloudinary security
    const signedUrl = cloudinary.url(publicId, {
      sign_url: true,
      resource_type: mimeType.includes('pdf') ? 'image' : 'raw',
      type: 'upload',
      secure: true
    });

    // Download file data with a generous timeout
    const response = await axios.get(signedUrl, { responseType: 'arraybuffer', timeout: 35000 });
    const buffer = Buffer.from(response.data);

    // 🔍 RENDER LOG CHECK: If this is small (<1000), the file is likely restricted or empty
    console.log(`📦 Buffer Size for ${publicId}: ${buffer.length} bytes`);

    if (buffer.length < 500) {
       return "Error: Storage retrieval returned empty or tiny data.";
    }

    if (mimeType === 'application/pdf') {
      try {
        const data = await pdf(buffer); // ✅ Correct function call
        const cleanText = data.text.replace(/\s+/g, ' ').trim();
        return cleanText.substring(0, 15000) || "Error: No text found in PDF.";
      } catch (pdfErr) {
        console.error("PDF Parse Logic Failed:", pdfErr.message);
        return `Error: PDF parsing library failed - ${pdfErr.message}`;
      }
    } 
    
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const data = await mammoth.extractRawText({ buffer });
      return data.value.trim().substring(0, 15000) || "Error: Word doc was empty.";
    }

    return "Error: Unsupported format.";
  } catch (err) {
    console.error('Final Extraction Failure:', err.message);
    return `Error: ${err.message}`; // Returns the specific error to the route
  }
};

module.exports = { extractTextFromUrl };