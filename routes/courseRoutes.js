const express = require('express');
const router = express.Router();
const Course = require('../models/Course'); // Pulls in your existing Course blueprint

// POST /api/courses/bulk - Add multiple courses at once
router.post('/bulk', async (req, res) => {
  try {
    const courses = req.body; 
    
    // insertMany takes the array of courses and adds them all to MongoDB efficiently
    const createdCourses = await Course.insertMany(courses);
    
    res.status(201).json({
      message: `${createdCourses.length} courses successfully added to the system!`,
      data: createdCourses
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to add courses.",
      error: error.message
    });
  }
});

module.exports = router;