const express = require('express');
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require('../middleware/roleMiddleware');

const { 
    createCourse, 
    getCourseById, 
    getCourses, 
    deleteCourse, 
    updateCourse 
} = require('../controllers/courseController');

const { 
    addTAs, 
    addStudents, 
    getMembers, 
    bulkAddMembersFromExcel 
} = require('../controllers/courseMemberController');

router.use(authMiddleware);

// Course CRUD routes
router.post('/', authorizeRoles('super_admin'), createCourse);
router.get('/', authorizeRoles('super_admin', 'professor', 'ta', 'student'), getCourses);
router.get('/:id', authorizeRoles('super_admin', 'professor', 'ta', 'student'), getCourseById);
router.put('/:id', authorizeRoles('super_admin'), updateCourse);
router.delete('/:id', authorizeRoles('super_admin'), deleteCourse);

// Course member management routes
router.post('/:courseId/tas', authorizeRoles('super_admin', 'professor'), addTAs);
router.post('/:courseId/students', authorizeRoles('super_admin', 'professor'), addStudents);
router.get('/:courseId/members', authorizeRoles('super_admin', 'professor', 'ta'), getMembers);
router.post('/:courseId/members/bulk-excel', authorizeRoles('super_admin', 'professor'), bulkAddMembersFromExcel);

module.exports = router;