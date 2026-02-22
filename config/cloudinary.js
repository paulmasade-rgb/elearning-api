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
    resource_type: 'auto' // Crucial for non-image files like PDFs
  }
});

const upload = multer({ storage: storage });

module.exports = { cloudinary, upload };