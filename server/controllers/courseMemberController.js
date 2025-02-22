const Course = require("../models/Course");
const User = require("../models/User");

const addTAs = async (req, res) => {
    try {
        const {courseId} = req.params;
        const {tas} = req.body;
        if(!tas || tas.length === 0) return res.status(400).json({message: "No TAs provided"});
        const course = await Course.findById(courseId);
        if(!course) return res.status(404).json({message: "Course not found"});
        if (course.professor.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to add TAs to this course.' });
        }
        const taIds = Array.isArray(tas) ? tas : [tas];
        
        // Check if any of the TAs are already students in this course
        for (const taId of taIds) {
            if (course.students.includes(taId)) {
                return res.status(400).json({ 
                    message: `User is already a student in this course and cannot be added as a TA.`
                });
            }
            if (course.TAs.includes(taId)) {
                return res.status(400).json({ 
                    message: `User is already a TA in this course.`
                });
            }
        }

        for (const taId of taIds) {
            const user = await User.findById(taId);
            if (!user || !user.roles.includes('ta')) {
              return res.status(400).json({ message: `User with id ${taId} is not a valid TA.` });
            }
        }

        const newTAs = taIds.filter(taId => !course.TAs.includes(taId));
        course.TAs.push(...newTAs);
        await course.save();

        const updatedCourse = await Course.findById(courseId)
            .populate('TAs', 'name email')
            .populate('students', 'name email');

        res.status(200).json({ message: "TAs added successfully", course: updatedCourse });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

const addStudents = async (req, res) => {
    try {
        const {courseId} = req.params;
        const {students} = req.body;
        if(!students || students.length === 0) return res.status(400).json({message: "No students provided"});
        const course = await Course.findById(courseId);
        if(!course) return res.status(404).json({message: "Course not found"});
        if (course.professor.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to add students to this course.' });
        }
        const studentIds = Array.isArray(students) ? students : [students];
        
        // Check if any of the students are already TAs in this course
        for (const studentId of studentIds) {
            if (course.TAs.includes(studentId)) {
                return res.status(400).json({ 
                    message: `User is already a TA in this course and cannot be added as a student.`
                });
            }
            if (course.students.includes(studentId)) {
                return res.status(400).json({ 
                    message: `User is already a student in this course.`
                });
            }
        }

        for (const studentId of studentIds) {
            const user = await User.findById(studentId);
            if (!user || !user.roles.includes('student')) {
              return res.status(400).json({ message: `User with id ${studentId} is not a valid student.` });
            }
        }

        const newStudents = studentIds.filter(studentId => !course.students.includes(studentId));
        course.students.push(...newStudents);
        await course.save();

        const updatedCourse = await Course.findById(courseId)
            .populate('TAs', 'name email')
            .populate('students', 'name email');

        res.status(200).json({ message: 'Students added successfully', course: updatedCourse });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: error.message});
    }
};
const getMembers = async (req, res) => {
    try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId)
    .populate('TAs', 'name email')
    .populate('students', 'name email');
    if (!course) {
        return res.status(404).json({ message: 'Course not found.' });
      }
      
      if (course.professor.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to view members of this course.' });
      }
      
      res.status(200).json({ TAs: course.TAs, students: course.students });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const xlsx = require('xlsx');

const bulkAddMembersFromExcel = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { memberType, excelData } = req.body;

    if (!excelData || !Array.isArray(excelData)) {
      return res.status(400).json({ message: 'Invalid data format' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.professor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const results = {
      successful: [],
      failed: []
    };

    for (const row of excelData) {
      try {
        const email = row.email?.trim();
        const name = row.name?.trim();

        if (!email || !name) {
          results.failed.push({ email: email || 'N/A', reason: 'Missing email or name' });
          continue;
        }

        let user = await User.findOne({ email });
        
        if (user) {
          // Check if user is already in the opposite role
          if (memberType === 'tas' && course.students.includes(user._id)) {
            results.failed.push({ email, reason: 'User is already a student in this course' });
            continue;
          }
          if (memberType === 'students' && course.TAs.includes(user._id)) {
            results.failed.push({ email, reason: 'User is already a TA in this course' });
            continue;
          }
        }

        if (!user) {
          // Create new user if doesn't exist
          const password = Math.random().toString(36).slice(-8);
          user = new User({
            name,
            email,
            password,
            role: memberType === 'tas' ? 'ta' : 'student'
          });
          await user.save();
        }

        if (memberType === 'tas') {
          if (user.role !== 'ta') {
            results.failed.push({ email, reason: 'User is not a TA' });
            continue;
          }
          if (!course.TAs.includes(user._id)) {
            course.TAs.push(user._id);
            results.successful.push({ email, name });
          } else {
            results.failed.push({ email, reason: 'Already added to course' });
          }
        } else {
          if (user.role !== 'student') {
            results.failed.push({ email, reason: 'User is not a student' });
            continue;
          }
          if (!course.students.includes(user._id)) {
            course.students.push(user._id);
            results.successful.push({ email, name });
          } else {
            results.failed.push({ email, reason: 'Already added to course' });
          }
        }
      } catch (error) {
        results.failed.push({ email: row.email || 'N/A', reason: error.message });
      }
    }

    await course.save();
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
module.exports = { addTAs, addStudents, getMembers,bulkAddMembersFromExcel };