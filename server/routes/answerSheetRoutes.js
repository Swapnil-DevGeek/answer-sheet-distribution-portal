const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { 
  uploadAnswerSheet, 
  getCourseAnswerSheets, 
  getMyAnswerSheets,
  bulkUploadAnswerSheets 
} = require('../controllers/answerSheetController');

router.use(authMiddleware);

router.post('/', authorizeRoles('professor', 'ta'), uploadAnswerSheet);
router.get('/course/:courseId', authorizeRoles('professor', 'ta'), getCourseAnswerSheets);
router.get('/mine', authorizeRoles('student'), getMyAnswerSheets);
router.post('/bulk', authorizeRoles('professor', 'ta'), bulkUploadAnswerSheets);

module.exports = router;