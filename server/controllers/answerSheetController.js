const AnswerSheet = require('../models/AnswerSheet');
const Course = require('../models/Course');
const User = require('../models/User');

const { extractStudentId, getEmailFromId } = require('../utils/studentMatcher');

const uploadAnswerSheet = async (req, res) => {
  try {
    const { course, student, examType, fileUrl } = req.body;

    if (!course || !student || !examType || !fileUrl) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    const courseData = await Course.findById(course);
    if (!courseData) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    const userId = req.user.id;
    if (
      req.user.activeRole === 'professor' &&
      courseData.professor.toString() !== userId
    ) {
      return res.status(403).json({ message: 'Not authorized: You are not assigned as professor for this course.' });
    }
    if (
      req.user.activeRole === 'ta' &&
      !courseData.TAs.map(taId => taId.toString()).includes(userId)
    ) {
      return res.status(403).json({ message: 'Not authorized: You are not added as a TA for this course.' });
    }

    const studentData = await User.findById(student);
    if (!studentData || !studentData.roles.includes('student')) {
      return res.status(400).json({ message: 'Invalid student id.' });
    }

    // Check for existing answer sheet and update if found
    const existingSheet = await AnswerSheet.findOne({
      course,
      student,
      examType
    });

    if (existingSheet) {
      existingSheet.fileUrl = fileUrl;
      existingSheet.uploadedBy = req.user.id;
      await existingSheet.save();
      return res.json(existingSheet);
    }

    // Create new answer sheet if none exists
    const answerSheet = new AnswerSheet({
      course,
      student,
      examType,
      fileUrl,
      uploadedBy: req.user.id,
    });
    await answerSheet.save();
    res.status(201).json(answerSheet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getCourseAnswerSheets = async (req, res) => {
  try {
    const { courseId } = req.params;
    const courseData = await Course.findById(courseId);
    if (!courseData) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    const userId = req.user.id;
    if (req.user.activeRole === 'professor' && courseData.professor.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to access answer sheets for this course.' });
    }
    if (req.user.activeRole === 'ta' && !courseData.TAs.map(taId => taId.toString()).includes(userId)) {
      return res.status(403).json({ message: 'Not authorized to access answer sheets for this course.' });
    }

    const answerSheets = await AnswerSheet.find({ course: courseId })
      .populate('student', 'name email')
      .populate('uploadedBy', 'name email')
      .select('-__v');
    res.json(answerSheets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyAnswerSheets = async (req, res) => {
  try {
    if (req.user.activeRole !== 'student') {
      return res.status(403).json({ message: 'Not authorized.' });
    }
    const answerSheets = await AnswerSheet.find({ student: req.user.id })
      .populate('course', 'title code')
      .populate('uploadedBy', 'name email')
      .select('-__v');
    res.json(answerSheets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const bulkUploadAnswerSheets = async (req, res) => {
  try {
    const { courseId, fileUrls, examType } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    const results = {
      successful: [],
      failed: []
    };

    for (const fileInfo of fileUrls) {
      try {
        const studentId = extractStudentId(fileInfo.name);
        if (!studentId) {
          results.failed.push({ file: fileInfo.name, reason: 'Invalid filename format' });
          continue;
        }

        const studentEmail = getEmailFromId(studentId);
        const student = await User.findOne({ email: studentEmail });

        if (!student) {
          results.failed.push({ file: fileInfo.name, reason: 'Student not found' });
          continue;
        }

        // Check for existing answer sheet not checking exam type
        const existingSheet = await AnswerSheet.findOne({
          course: courseId,
          student: student._id
        });

        if (existingSheet) {
          // Update existing answer sheet
          existingSheet.fileUrl = fileInfo.url;
          existingSheet.uploadedBy = req.user.id;
          existingSheet.examType = examType;
          await existingSheet.save();
          results.successful.push({ 
            file: fileInfo.name, 
            student: student.email, 
            status: 'updated' 
          });
        } else {
          // Create new answer sheet
          const answerSheet = new AnswerSheet({
            course: courseId,
            student: student._id,
            examType,
            fileUrl: fileInfo.url,
            uploadedBy: req.user.id
          });
          await answerSheet.save();
          results.successful.push({ 
            file: fileInfo.name, 
            student: student.email,
            status: 'created'
          });
        }
      } catch (error) {
        results.failed.push({ file: fileInfo.name, reason: error.message });
      }
    }

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { 
  uploadAnswerSheet, 
  getCourseAnswerSheets, 
  getMyAnswerSheets,
  bulkUploadAnswerSheets 
};