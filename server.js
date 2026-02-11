const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Import Routes
const authRoutes = require('./routes/auth'); 
const userRoutes = require('./routes/users');

dotenv.config();
const app = express();

// --- CORS CONFIGURATION (Dynamic Fix) ---
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Define allowed domains
    const allowedDomains = [
      'http://localhost:5173',                    // Vite Local
      'http://127.0.0.1:5173',                    // Vite Local IP
      'https://elearning-gamified.vercel.app'     // Main Vercel App
    ];
    
    // CHECK: Is it an allowed domain OR a Vercel preview link?
    // This allows ANY URL ending in .vercel.app (great for testing)
    if (allowedDomains.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    } else {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
  },
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