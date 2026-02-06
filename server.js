const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
// 1. IMPORT YOUR NEW AUTH ROUTES
const authRoutes = require('./routes/auth'); 
const userRoutes = require('./routes/users');

dotenv.config();
const app = express();

// CORS: We keep your specific list because it is more secure!
app.use(cors({
  origin: [
    'http://localhost:5173',               // Your Local Frontend
    'http://localhost:5000',               // Your Local Backend (optional self-reference)
    'https://elearning-gamified.vercel.app', 
    'https://elearning-gamified-paulmasade-rgb.vercel.app'
  ],
  credentials: true
}));

app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// 2. ADD THE AUTH ROUTE MIDDLEWARE
app.use('/api/auth', authRoutes);  // This activates /api/auth/register, /login, etc.
app.use('/api/users', userRoutes);

// Health Check
app.get('/status', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));