const express = require('express');
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {getProfile,updateProfile, getProfessors, getStudents, getTAs} = require('../controllers/userController');

router.use(authMiddleware);

// GET /api/users/me – Get current user profile
router.get('/me', getProfile);
// PUT /api/users/me – Update current user profile
router.put('/me', updateProfile);
// GET /api/users/professors - Get list of professors
router.get('/professors',getProfessors);
// GET /api/users/students - Get list of students
router.get('/students',getStudents);
// GET /api/users/tas - Get list of tas
router.get('/tas',getTAs);

module.exports = router;