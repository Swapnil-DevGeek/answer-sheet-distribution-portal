const express = require('express');
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require('../middleware/roleMiddleware');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');

// Import the models
const Course = require('../models/Course');
const User = require('../models/User');

const { createCourse,getCourseById,getCourses,deleteCourse,updateCourse } = require('../controllers/courseController');

router.use(authMiddleware);
// router.use(authorizeRoles('super_admin','professor','ta','student'));

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

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

// Bulk add students to a course
router.post('/:courseId/bulk-students', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const courseId = req.params.courseId;
    
    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check permissions (only professor of the course or admin can add students)
    if (req.user.role !== 'super_admin' && 
        req.user.role !== 'professor' && 
        course.professor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify this course' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const results = [];
    const errors = [];
    let success = 0;
    let failed = 0;

    // Process the file based on type
    if (req.file.mimetype === 'text/csv') {
      // Handle CSV
      fs.createReadStream(filePath)
        .pipe(csv({
          mapHeaders: ({ header }) => {
            return header.toLowerCase().trim();
          }
        }))
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          await processStudents(results);
          cleanUp();
        });
    } else {
      // Handle Excel
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet, { 
        header: 1,
        raw: false,
        defval: ""
      });
      
      // Process Excel data with headers
      if (data.length > 0) {
        const headers = data[0].map(h => String(h).toLowerCase().trim());
        const emailIndex = headers.indexOf('email');
        
        if (emailIndex === -1) {
          return res.status(400).json({ 
            message: 'Invalid file format', 
            error: 'File must contain an "email" column' 
          });
        }
        
        // Convert rows to objects with proper keys
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row.length > 0) {
            const record = {};
            record.email = row[emailIndex] || '';
            results.push(record);
          }
        }
      }
      
      await processStudents(results);
      cleanUp();
    }

    async function processStudents(students) {
      for (const student of students) {
        try {
          const email = student.email.trim().toLowerCase();

          if (!email) {
            errors.push(`Missing email for a record`);
            failed++;
            continue;
          }

          // Find the user by email
          const user = await User.findOne({ email, role: 'student' });
          if (!user) {
            errors.push(`No student found with email ${email}`);
            failed++;
            continue;
          }

          // Check if student is already in the course
          if (course.students.includes(user._id)) {
            errors.push(`Student ${email} is already in the course`);
            failed++;
            continue;
          }

          // Add student to course
          course.students.push(user._id);
          success++;
        } catch (err) {
          console.error('Error processing student:', err);
          errors.push(`Error processing ${student.email || 'unknown'}: ${err.message}`);
          failed++;
        }
      }

      // Save the updated course
      await course.save();
    }

    function cleanUp() {
      // Delete the temporary file
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });

      return res.status(200).json({
        message: 'Bulk student addition processed',
        success,
        failed,
        errors
      });
    }
  } catch (error) {
    console.error('Error processing file:', error);
    // Delete the temporary file if it exists
    if (req.file) {
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
      });
    }
    return res.status(500).json({ message: 'Error processing file', error: error.message });
  }
});

// Bulk add TAs to a course
router.post('/:courseId/bulk-tas', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const courseId = req.params.courseId;
    
    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check permissions (only professor of the course or admin can add TAs)
    if (req.user.role !== 'super_admin' && 
        req.user.role !== 'professor' && 
        course.professor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify this course' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const results = [];
    const errors = [];
    let success = 0;
    let failed = 0;

    // Process the file based on type
    if (req.file.mimetype === 'text/csv') {
      // Handle CSV
      fs.createReadStream(filePath)
        .pipe(csv({
          mapHeaders: ({ header }) => {
            return header.toLowerCase().trim();
          }
        }))
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          await processTAs(results);
          cleanUp();
        });
    } else {
      // Handle Excel
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet, { 
        header: 1,
        raw: false,
        defval: ""
      });
      
      // Process Excel data with headers
      if (data.length > 0) {
        const headers = data[0].map(h => String(h).toLowerCase().trim());
        const emailIndex = headers.indexOf('email');
        
        if (emailIndex === -1) {
          return res.status(400).json({ 
            message: 'Invalid file format', 
            error: 'File must contain an "email" column' 
          });
        }
        
        // Convert rows to objects with proper keys
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row.length > 0) {
            const record = {};
            record.email = row[emailIndex] ? row[emailIndex].trim() : '';
            results.push(record);
          }
        }
      }
      
      await processTAs(results);
      cleanUp();
    }

    async function processTAs(tas) {
      for (const ta of tas) {
        try {
          // Make sure to trim the email and convert to lowercase
          const email = ta.email ? ta.email.trim().toLowerCase() : '';
          console.log(`Processing TA email: '${email}'`);

          if (!email) {
            errors.push(`Missing email for a record`);
            failed++;
            continue;
          }

          // Find the user by email - using trimmed email
          const user = await User.findOne({ email: email });
          if (!user) {
            errors.push(`No user found with email ${email}`);
            failed++;
            continue;
          }

          // Check if TA is already in the course
          if (course.TAs.includes(user._id)) {
            errors.push(`User ${email} is already a TA in the course`);
            failed++;
            continue;
          }

          // Add TA to course
          course.TAs.push(user._id);
          
          // Update user to mark as TA if not already
          if (!user.isTa) {
            user.isTa = true;
            await user.save();
          }
          
          success++;
        } catch (err) {
          console.error('Error processing TA:', err);
          errors.push(`Error processing ${ta.email || 'unknown'}: ${err.message}`);
          failed++;
        }
      }

      // Save the updated course
      await course.save();
    }

    function cleanUp() {
      // Delete the temporary file
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });

      return res.status(200).json({
        message: 'Bulk TA addition processed',
        success,
        failed,
        errors
      });
    }
  } catch (error) {
    console.error('Error processing file:', error);
    // Delete the temporary file if it exists
    if (req.file) {
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
      });
    }
    return res.status(500).json({ message: 'Error processing file', error: error.message });
  }
});

module.exports = router;