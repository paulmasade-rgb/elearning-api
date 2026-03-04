const router = require('express').Router();
const Course = require('../models/Course');

// --- GET ALL COURSES (For Students & Admins) ---
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find();
    res.status(200).json(courses);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch curriculum" });
  }
});

// --- ADD NEW COURSE (Admin Only) ---
router.post('/', async (req, res) => {
  try {
    const newCourse = new Course(req.body);
    const savedCourse = await newCourse.save();
    res.status(201).json(savedCourse);
  } catch (err) {
    res.status(500).json({ error: "Failed to deploy course" });
  }
});

// --- ADD MULTIPLE COURSES (Bulk Upload) ---
router.post('/bulk', async (req, res) => {
  try {
    const courses = req.body; 
    
    // insertMany efficiently adds the entire array to MongoDB
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

// --- DELETE A COURSE (Admin Only) ---
router.delete('/:id', async (req, res) => {
  try {
    await Course.findByIdAndDelete(req.params.id);
    res.status(200).json("Course successfully removed.");
  } catch (err) {
    res.status(500).json({ error: "Failed to delete course" });
  }
});

module.exports = router;