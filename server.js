const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Import Routes
const authRoutes = require('./routes/auth'); 
const userRoutes = require('./routes/users');

dotenv.config();
const app = express();

// --- CORS CONFIGURATION (Fix for Access Blocked Error) ---
app.use(cors({
  origin: [
    'http://localhost:5173',                    // Vite Local
    'http://127.0.0.1:5173',                    // Vite Local IP
    'https://elearning-gamified.vercel.app',    // Your Main Vercel App
    // Add any other deployed frontend URLs here if needed
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware to parse JSON bodies
app.use(express.json());

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// --- ROUTES ---
app.use('/api/auth', authRoutes);   
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