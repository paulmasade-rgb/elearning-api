const axios = require('axios');
const pdfParse = require('pdf-parse'); // ✅ Renamed to avoid clashing with function calls
const mammoth = require('mammoth');
const { cloudinary } = require('../config/cloudinary'); 

const extractTextFromUrl = async (url, mimeType) => {
  try {
    console.log(`--- Authenticated Extraction Started: ${url} ---`);

    const parts = url.split('/');
    const folderAndFile = parts.slice(-2).join('/'); 
    const publicId = folderAndFile.split('.')[0]; 

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
      const fallbackUrl = cloudinary.url(publicId, {
        sign_url: true,
        resource_type: mimeType.includes('pdf') ? 'raw' : 'image',
        type: 'upload',
        secure: true
      });
      const fallbackResponse = await axios.get(fallbackUrl, { responseType: 'arraybuffer' });
      buffer = Buffer.from(fallbackResponse.data);
    }

    if (mimeType === 'application/pdf') {
      // ✅ Use pdfParse instead of the clashing 'pdf' name
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
    return "Error: Storage retrieval failed.";
  }
};

module.exports = { extractTextFromUrl };