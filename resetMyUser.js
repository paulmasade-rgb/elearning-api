const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const TARGET_USERNAME = "KAY FLOCK"; 

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log(`Searching for scholar: ${TARGET_USERNAME}...`);
    
    const user = await User.findOne({ username: TARGET_USERNAME });
    
    if (!user) {
      console.log("❌ User not found. Check the username.");
      process.exit(1);
    }

    // ✅ RESET ACADEMIC RECORDS
    user.enrolledCourses = [];
    user.completedCourses = [];

    await user.save();
    console.log(`✅ SUCCESS: Academic record reset for ${TARGET_USERNAME}.`);
    console.log("You can now log in and see the fresh Course Catalog.");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ DB Error:", err.message);
    process.exit(1);
  });