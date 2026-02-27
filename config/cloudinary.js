// config/cloudinary.js
const cloudinary = require('cloudinary').v2;

const config = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
};

cloudinary.config(config);

console.log("Cloudinary startup config:");
console.log("  cloud_name:", config.cloud_name || "[MISSING]");
console.log("  api_key:", config.api_key ? "present" : "[MISSING]");
console.log("  api_secret:", config.api_secret ? "present" : "[MISSING]");

module.exports = cloudinary;