const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Import Routes
const authRoutes = require('./routes/auth'); 
const userRoutes = require('./routes/users');

dotenv.config();
const app = express();

// --- CORS CONFIGURATION ---
// This allows your frontend to talk to this backend
app.use(cors({
  origin: [
    'http://localhost:5173',                  // Local Frontend
    'http://localhost:5000',                  // Local Backend
    'http://127.0.0.1:5173',                  // Local Frontend (IP version)
    'https://elearning-gamified.vercel.app',  // Live Vercel App
    'https://elearning-gamified-paulmasade-rgb.vercel.app'
  ],
  credentials: true
}));

// Middleware to parse JSON bodies
app.use(express.json());

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// --- ROUTES ---
app.use('/api/auth', authRoutes);   // Activates /api/auth/login, /resetpassword, etc.
app.use('/api/users', userRoutes);

// Health Check Endpoint
app.get('/status', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));