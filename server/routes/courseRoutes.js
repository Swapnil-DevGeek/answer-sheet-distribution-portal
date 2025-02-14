const express = require('express');
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require('../middleware/roleMiddleware');

const { createCourse,getCourseById,getCourses,deleteCourse,updateCourse } = require('../controllers/courseController');

router.use(authMiddleware);
router.use(authorizeRoles('super_admin','professor','ta','student'));

// POST /api/courses – Create a new course
router.post('/', createCourse);

// GET /api/courses – Get all courses
router.get('/', getCourses);

// GET /api/courses/:id – Get a single course by ID
router.get('/:id', getCourseById);

// PUT /api/courses/:id – Update a course by ID
router.put('/:id', updateCourse);

// DELETE /api/courses/:id – Delete a course by ID
router.delete('/:id', deleteCourse);

module.exports = router;