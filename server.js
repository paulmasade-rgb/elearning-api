const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const authRoute = require('./routes/auth');
const userRoute = require('./routes/users'); // <--- NEW

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoute);
app.use('/api/users', userRoute); // <--- NEW

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error(err));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
