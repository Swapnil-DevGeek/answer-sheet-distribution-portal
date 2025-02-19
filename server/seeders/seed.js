const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Course = require('../models/Course');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Course.deleteMany({});

    // Create users
    const hashedPassword = await bcrypt.hash('password123', 10);

    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'super_admin'
    });

    const professor = await User.create({
      name: 'Professor Smith',
      email: 'professor@example.com',
      password: hashedPassword,
      role: 'professor'
    });

    const ta = await User.create({
      name: 'TA Johnson',
      email: 'ta@example.com',
      password: hashedPassword,
      role: 'ta'
    });

    const student = await User.create({
      name: 'Student Doe',
      email: 'student@example.com',
      password: hashedPassword,
      role: 'student'
    });

    // Create courses
    const course1 = await Course.create({
      title: 'Introduction to Computer Science',
      code: 'CS101',
      description: 'Basic concepts of computer science',
      professor: professor._id,
      TAs: [ta._id],
      students: [student._id]
    });

    const course2 = await Course.create({
      title: 'Data Structures',
      code: 'CS201',
      description: 'Advanced data structures and algorithms',
      professor: professor._id,
      TAs: [ta._id],
      students: [student._id]
    });

    console.log('Database seeded successfully');
    console.log('\nTest Account Credentials:');
    console.log('Super Admin - Email: admin@example.com, Password: password123');
    console.log('Professor - Email: professor@example.com, Password: password123');
    console.log('TA - Email: ta@example.com, Password: password123');
    console.log('Student - Email: student@example.com, Password: password123');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
  }
};

seedDatabase();