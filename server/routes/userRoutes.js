const express = require('express');
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {getProfile,updateProfile, getProfessors, getStudents, getTAs, getUsers} = require('../controllers/userController');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const { parse } = require('csv');

router.use(authMiddleware);

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

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

// GET /api/users - Get users with pagination and filtering
router.get('/', getUsers);

// Register user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Trim whitespace from name and email
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    
    // Check if user already exists
    const userExists = await User.findOne({ email: trimmedEmail });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user with trimmed values and hashed password
    const user = new User({
      name: trimmedName,
      email: trimmedEmail,
      password: hashedPassword,
      role: role || 'student'
    });
    
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });
    
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Bulk upload users
router.post('/bulk-upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Check if user has permission to bulk upload
    if (req.user.role !== 'super_admin' && req.user.role !== 'professor') {
      return res.status(403).json({ message: 'Not authorized to bulk upload users' });
    }
    
    const trimWhitespace = req.body.trimWhitespace === 'true';
    const results = { success: 0, failed: 0, errors: [] };
    
    // Process the uploaded file
    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    
    let users = [];
    
    try {
      if (fileExtension === '.csv') {
        // Process CSV file using a different approach
        const fileContent = fs.readFileSync(filePath, 'utf8');
        
        // Use csv-parser instead of parse
        const results = [];
        
        // Create a promise to handle the CSV parsing
        await new Promise((resolve, reject) => {
          fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => {
              // Log each row to see what fields are available
              console.log('CSV row data:', data);
              
              // Normalize field names (case-insensitive)
              const normalizedData = {};
              for (const key in data) {
                const lowerKey = key.toLowerCase().trim();
                normalizedData[lowerKey] = data[key];
              }
              
              // Map to expected field names
              const mappedData = {
                name: normalizedData.name || normalizedData.fullname || normalizedData['full name'] || normalizedData.username || '',
                email: normalizedData.email || normalizedData['e-mail'] || normalizedData.mail || '',
                role: normalizedData.role || normalizedData.type || 'student'
              };
              
              results.push(mappedData);
            })
            .on('end', () => {
              users = results;
              console.log('CSV parsing complete. Found', users.length, 'users');
              console.log('Sample user data:', users.slice(0, 2));
              resolve();
            })
            .on('error', (error) => {
              reject(error);
            });
        });
      } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        // Process Excel file
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = xlsx.utils.sheet_to_json(worksheet);
        
        // Normalize field names for Excel data
        users = rawData.map(row => {
          // Log each row to see what fields are available
          console.log('Excel row data:', row);
          
          // Normalize field names (case-insensitive)
          const normalizedData = {};
          for (const key in row) {
            const lowerKey = key.toLowerCase().trim();
            normalizedData[lowerKey] = row[key];
          }
          
          // Map to expected field names
          return {
            name: normalizedData.name || normalizedData.fullname || normalizedData['full name'] || normalizedData.username || '',
            email: normalizedData.email || normalizedData['e-mail'] || normalizedData.mail || '',
            role: normalizedData.role || normalizedData.type || 'student'
          };
        });
        
        console.log('Excel parsing complete. Found', users.length, 'users');
        console.log('Sample user data:', users.slice(0, 2));
      } else {
        return res.status(400).json({ message: 'Unsupported file format' });
      }
      
      // Validate that users is an array
      if (!Array.isArray(users)) {
        throw new Error('Parsed data is not an array');
      }
      
      if (users.length === 0) {
        return res.status(400).json({ message: 'No users found in the uploaded file' });
      }
    } catch (err) {
      console.error('Error parsing file:', err);
      return res.status(400).json({ 
        message: 'Error parsing file', 
        error: err.message 
      });
    }
    
    // Process each user
    for (const user of users) {
      try {
        // Log the user object to see what we're working with
        console.log('Processing user:', user);
        
        // Check if user object has required fields
        if (!user.name || !user.email) {
          results.errors.push(`Missing required fields for user: ${JSON.stringify(user)}`);
          results.failed++;
          continue;
        }
        
        // Trim whitespace if requested
        const name = trimWhitespace ? user.name.trim() : user.name;
        const email = trimWhitespace ? user.email.trim().toLowerCase() : user.email.toLowerCase();
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          results.errors.push(`User with email ${email} already exists`);
          results.failed++;
          continue;
        }
        
        // Generate a random password
        const password = Math.random().toString(36).slice(-8);
        
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Create new user
        const newUser = new User({
          name,
          email,
          password: hashedPassword,
          role: user.role || 'student'
        });
        
        await newUser.save();
        results.success++;
        
        // Send email with credentials (implement this)
        // sendWelcomeEmail(email, password);
      } catch (err) {
        console.error(`Error processing user:`, err);
        results.errors.push(`Error processing user: ${err.message}`);
        results.failed++;
      }
    }
    
    // Clean up the uploaded file
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('Error deleting file:', err);
    }
    
    return res.status(200).json({
      message: 'Bulk user upload processed',
      ...results
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;