const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// 1. IMPORT ROUTES
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const socialRoutes = require('./routes/social'); 
const postRoutes = require('./routes/posts'); 

dotenv.config();

// 2. INITIALIZE APP
const app = express();

// 3. CORS CONFIGURATION (Standardized for Production/Localhost)
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://elearning-gamified.vercel.app',
  'https://elearning-api-dr6r.onrender.com'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Check if origin is in our list or matches a vercel preview branch
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('CORS Policy: Origin not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// ✅ THE FIX: app.use(cors()) handles all methods including OPTIONS automatically.
// We removed app.options('(.*)') because unnamed wildcards crash Express v5.
app.use(cors(corsOptions));

// 4. MIDDLEWARE
app.use(express.json());

// 5. DATABASE CONNECTION
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err.message));

// 6. REGISTER ROUTES
app.use('/api/auth', authRoutes);   
app.use('/api/users', userRoutes);
app.use('/api/social', socialRoutes); 
app.use('/api/posts', postRoutes);

// Health Check
app.get('/status', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// 7. START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));