const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Course = require('./models/Course'); 

dotenv.config();

const advancedCourses = [
  { title: "System Design & Architecture", module: "Module 4", xp: 200, videoId: "bU6ZJaFq1jw" },
  { title: "Database Schema Fundamentals", module: "Module 5", xp: 250, videoId: "ztHopE5Wnpc" },
  { title: "Advanced React Patterns", module: "Module 6", xp: 300, videoId: "w7ejDZ8SWv8" },
  { title: "Agile & Scrum Methodologies", module: "Module 7", xp: 150, videoId: "9TycLR0TqFA" },
  { title: "CI/CD Deployment Pipelines", module: "Module 8", xp: 350, videoId: "OPwU3UWC0-s" },
  { title: "Cybersecurity Best Practices", module: "Module 9", xp: 250, videoId: "inWWhr5tnEA" },
  { title: "Cloud Computing with AWS", module: "Module 10", xp: 400, videoId: "3XFODda6YXA" }
];

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ Connected to DB. Injecting advanced curriculum...");
    await Course.insertMany(advancedCourses);
    console.log("🚀 Courses successfully added to the catalog!");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ Database Connection Error:", err.message);
    process.exit(1);
  });