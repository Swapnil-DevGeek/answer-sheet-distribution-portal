const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const { uploadAnswerSheet, getCourseAnswerSheets, getMyAnswerSheets } = require('../controllers/answerSheetController');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;

// Import models
const User = require('../models/User');
const Course = require('../models/Course');
const AnswerSheet = require('../models/AnswerSheet');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage: storage });

router.use(authMiddleware);

router.post('/', authorizeRoles('professor', 'ta'), uploadAnswerSheet);
router.get('/course/:courseId', authorizeRoles('professor'), getCourseAnswerSheets);
router.get('/mine', authorizeRoles('student'), getMyAnswerSheets);

// Bulk upload answer sheets (ZIP file with PDFs)
router.post('/bulk-upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Debug the user object to see what's available
    console.log('User object:', req.user);
    console.log('User ID type:', typeof req.user._id);
    console.log('User ID:', req.user._id);
    
    // Ensure we have a valid user ID
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated properly' });
    }

    const courseId = req.body.courseId;
    const examType = req.body.examType || 'quiz';
    const uploaderId = req.user._id; // Store this separately for clarity
    
    // Validate exam type against allowed values
    const validExamTypes = ['quiz', 'assignment', 'exam', 'midterm', 'final'];
    if (!validExamTypes.includes(examType)) {
      return res.status(400).json({ 
        message: 'Invalid exam type', 
        error: `Exam type must be one of: ${validExamTypes.join(', ')}` 
      });
    }
    
    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check permissions (only professor of the course or admin can upload)
    if (req.user.role !== 'super_admin' && 
        req.user.role !== 'professor' && 
        course.professor.toString() !== req.user._id.toString() &&
        !course.TAs.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to upload to this course' });
    }

    // Log the user ID to verify it exists
    console.log('Current user ID:', req.user._id);

    const zipFilePath = req.file.path;
    const extractPath = path.join('uploads', uuidv4());
    
    // Create extraction directory
    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
    }
    
    // Extract the ZIP file
    const zip = new AdmZip(zipFilePath);
    zip.extractAllTo(extractPath, true);
    
    // Get all PDF files from the extracted directory
    const files = fs.readdirSync(extractPath).filter(file => 
      file.toLowerCase().endsWith('.pdf')
    );
    
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    // Process each PDF file
    for (const file of files) {
      try {
        // Extract email from filename (remove .pdf extension)
        const email = file.slice(0, -4);
        
        // Find the student by email
        const student = await User.findOne({ email, role: 'student' });
        
        if (!student) {
          results.errors.push(`No student found with email ${email}`);
          results.failed++;
          continue;
        }
        
        // Check if student is enrolled in the course
        if (!course.students.includes(student._id)) {
          // Auto-enroll the student in the course
          course.students.push(student._id);
          await course.save();
          console.log(`Auto-enrolled student ${email} in the course`);
        }
        
        // Check if answer sheet already exists for this student and exam type
        const existingSheet = await AnswerSheet.findOne({
          student: student._id,
          course: courseId,
          examType
        });
        
        if (existingSheet) {
          results.errors.push(`Answer sheet already exists for ${email} for this exam type`);
          results.failed++;
          continue;
        }
        
        // Upload the file to Cloudinary
        const sourceFilePath = path.join(extractPath, file);
        const cloudinaryResult = await cloudinary.uploader.upload(sourceFilePath, {
          folder: `answersheets/${courseId}/${examType}`,
          public_id: `${student._id}-${Date.now()}`,
          resource_type: 'auto'
        });
        
        // Create new answer sheet with explicit uploadedBy field
        const answerSheetData = {
          student: student._id,
          course: courseId,
          examType,
          fileUrl: cloudinaryResult.secure_url,
          uploadedBy: uploaderId
        };
        
        console.log('Answer sheet data:', answerSheetData);
        
        // Create and save the answer sheet
        const newAnswerSheet = new AnswerSheet(answerSheetData);
        await newAnswerSheet.save();
        
        results.success++;
      } catch (err) {
        console.error(`Error processing file ${file}:`, err);
        results.errors.push(`Error processing ${file}: ${err.message}`);
        results.failed++;
      }
    }
    
    // Clean up
    try {
      fs.unlinkSync(zipFilePath); // Remove the zip file
      fs.rmSync(extractPath, { recursive: true, force: true }); // Remove the extraction directory
    } catch (err) {
      console.error('Error cleaning up temporary files:', err);
    }
    
    return res.status(200).json({
      message: 'Bulk answer sheet upload processed',
      ...results
    });
  } catch (error) {
    console.error('Error processing ZIP file:', error);
    // Clean up the uploaded file if it exists
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ message: 'Error processing ZIP file', error: error.message });
  }
});

module.exports = router;