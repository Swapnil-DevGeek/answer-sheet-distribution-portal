const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Course = require('../models/Course');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/answer-sheet-portal");
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Course.deleteMany({});

    const hashedPassword = await bcrypt.hash('password123', 10);
    // Create users with various roles
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'admin@example.com',
      password: hashedPassword,
      roles: ['super_admin']
    });
    const professor = await User.create({
      name: 'Professor Smith',
      email: 'professor@example.com',
      password: hashedPassword,
      roles: ['professor']
    });
    const taStudent = await User.create({
      name: 'John Doe',
      email: 'johnta@example.com',
      password: hashedPassword,
      roles: ['ta', 'student']  // User with multiple roles
    });
    const regularStudent = await User.create({
      name: 'Jane Smith',
      email: 'jane@example.com',
      password: hashedPassword,
      roles: ['student']
    });
    // Create courses demonstrating role separation
    const course1 = await Course.create({
      title: 'Introduction to Computer Science',
      code: 'CS101',
      description: 'Basic concepts of computer science',
      professor: professor._id,
      TAs: [taStudent._id],  // taStudent is a TA in this course
      students: [regularStudent._id]
    });
    const course2 = await Course.create({
      title: 'Data Structures',
      code: 'CS201',
      description: 'Advanced data structures and algorithms',
      professor: professor._id,
      TAs: [regularStudent._id],
      students: [taStudent._id]  // taStudent is a student in this course
    });
    console.log('Database seeded successfully');
    console.log('\nTest Account Credentials:');
    console.log('Super Admin - Email: admin@example.com, Password: password123');
    console.log('Professor - Email: professor@example.com, Password: password123');
    console.log('TA/Student - Email: johnta@example.com, Password: password123');
    console.log('Student - Email: jane@example.com, Password: password123');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
  }
};

seedDatabase();