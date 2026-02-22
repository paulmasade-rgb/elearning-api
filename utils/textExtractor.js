const axios = require('axios');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

const extractTextFromUrl = async (url, mimeType) => {
  try {
    // 1. Download the file as a buffer
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    // 2. Parse based on file type
    if (mimeType === 'application/pdf') {
      const data = await pdf(buffer);
      return data.text;
    } 
    
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const data = await mammoth.extractRawText({ buffer });
      return data.value;
    }

    if (mimeType === 'text/plain') {
      return buffer.toString('utf-8');
    }

    throw new Error('Unsupported file type for extraction');
  } catch (err) {
    console.error('Extraction Error:', err.message);
    return null;
  }
};

module.exports = { extractTextFromUrl };