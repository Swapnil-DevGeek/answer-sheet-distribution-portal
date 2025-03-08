const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { uploadAnswerSheet, getCourseAnswerSheets, getMyAnswerSheets } = require('../controllers/answerSheetController');

router.use(authMiddleware);

router.post('/', authorizeRoles('professor', 'ta'), uploadAnswerSheet);
router.get('/course/:courseId', authorizeRoles('professor'), getCourseAnswerSheets);
router.get('/mine', authorizeRoles('student'), getMyAnswerSheets);

module.exports = router;