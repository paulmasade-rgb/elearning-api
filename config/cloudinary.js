const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'vici_study_vault',
    allowed_formats: ['pdf', 'docx', 'txt', 'jpg', 'png'],
    resource_type: 'auto',
    // ✅ Fixes the 401 Extraction error by allowing server-side read access
    type: 'upload', 
    access_mode: 'public'
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB Limit for large notes
});

module.exports = { cloudinary, upload };