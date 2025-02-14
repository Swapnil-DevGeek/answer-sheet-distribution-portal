const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { addTAs, addStudents, getMembers } = require('../controllers/courseMemberController');

router.use(authMiddleware);
router.use(authorizeRoles('professor'));

// POST /api/courses/:courseId/tas
router.post('/:courseId/tas', addTAs);

// POST /api/courses/:courseId/students
router.post('/:courseId/students', addStudents);

// GET /api/courses/:courseId/members
router.get('/:courseId/members', getMembers);

module.exports = router;