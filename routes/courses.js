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