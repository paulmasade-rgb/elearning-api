const axios = require('axios');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { cloudinary } = require('../config/cloudinary'); 

const extractTextFromUrl = async (url, mimeType) => {
  try {
    console.log(`--- Initiating Authenticated Extraction: ${url} ---`);

    // 1. Correctly extract the publicId including the folder name
    // Example: .../vici_study_vault/hnvaj24q.pdf -> vici_study_vault/hnvaj24q
    const parts = url.split('/');
    const folderAndFile = parts.slice(-2).join('/'); // Grabs 'vici_study_vault/filename.pdf'
    const publicId = folderAndFile.split('.')[0];    // Removes the extension

    console.log(`🔍 Targeting Public ID: ${publicId}`);

    // 2. Generate a SIGNED URL using the SDK
    // This uses your API Secret to prove the server has permission to read the file
    const signedUrl = cloudinary.url(publicId, {
      resource_type: 'raw', 
      secure: true,
      sign_url: true 
    });

    // 3. Download using the signed URL with a longer timeout
    const response = await axios({
      method: 'get',
      url: signedUrl,
      responseType: 'arraybuffer',
      timeout: 35000 
    });
    
    const buffer = Buffer.from(response.data);

    // 4. Extraction Logic (limited to 15k characters for Gemini stability)
    if (mimeType === 'application/pdf') {
      try {
        const data = await pdf(buffer);
        const cleanText = data.text.replace(/\s+/g, ' ').trim();
        return cleanText.substring(0, 15000) || "PDF contained no readable text.";
      } catch (pdfErr) {
        console.error("PDF Parsing Error:", pdfErr.message);
        return "Error: PDF parsing failed.";
      }
    } 
    
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        const data = await mammoth.extractRawText({ buffer });
        return data.value.trim().substring(0, 15000) || "Word document was empty.";
      } catch (docErr) {
        console.error("Word Parse Error:", docErr.message);
        return "Error: Word extraction failed.";
      }
    }

    if (mimeType === 'text/plain') {
      return buffer.toString('utf-8').trim().substring(0, 15000);
    }

    return "Unsupported format.";
  } catch (err) {
    console.error('Extraction Failure Details:', {
      message: err.message,
      status: err.response?.status
    });
    return "Error: Storage security blocked content retrieval.";
  }
};

module.exports = { extractTextFromUrl };