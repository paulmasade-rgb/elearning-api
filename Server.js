const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first'); // ✅ FORCES Node.js to prioritize IPv4 globally

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

// 1. IMPORT ALL ROUTES
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const socialRoutes = require('./routes/social'); 
const postRoutes = require('./routes/posts'); 
const quizRoutes = require('./routes/quizzes'); 
const courseRoutes = require('./routes/courses'); 
const studyVaultRoutes = require('./routes/studyVault'); 

// 2. INITIALIZE APP
const app = express();

// 3. CORS CONFIGURATION
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://elearning-gamified.vercel.app',
  'https://elearning-api-dr6r.onrender.com'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('CORS Policy: Origin not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 4. MIDDLEWARE (Restored & Expanded to 10MB)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 5. DATABASE CONNECTION
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err.message));

// 6. REGISTER ALL ROUTES
app.use('/api/auth', authRoutes);   
app.use('/api/users', userRoutes);
app.use('/api/social', socialRoutes); 
app.use('/api/posts', postRoutes);
app.use('/api/quizzes', quizRoutes); 
app.use('/api/courses', courseRoutes); 
app.use('/api/study-vault', studyVaultRoutes);

app.get('/status', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 7. START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));