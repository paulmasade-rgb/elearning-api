const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// 1. IMPORT ROUTES
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const socialRoutes = require('./routes/social'); 
const postRoutes = require('./routes/posts'); // Standardized import

dotenv.config();

// 2. INITIALIZE APP (MUST happen before app.use)
const app = express();

// 3. CORS CONFIGURATION (Dynamic Fix for Vercel/Localhost)
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowedDomains = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://elearning-gamified.vercel.app'
    ];
    
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

// 4. MIDDLEWARE
app.use(express.json());

// 5. DATABASE CONNECTION
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
    // Note: getaddrinfo ENOTFOUND usually means your internet is down 
    // or your IP isn't whitelisted in Atlas.
  });

// 6. REGISTER ROUTES
app.use('/api/auth', authRoutes);   
app.use('/api/users', userRoutes);
app.use('/api/social', socialRoutes); 
app.use('/api/posts', postRoutes);

// Health Check Endpoint
app.get('/status', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// 7. START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));