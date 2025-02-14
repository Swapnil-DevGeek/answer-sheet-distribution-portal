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
        for (const taId of taIds) {
            const user = await User.findById(taId);
            if (!user || user.role !== 'ta') {
              return res.status(400).json({ message: `User with id ${taId} is not a valid TA.` });
            }
        }

        const newTAs = taIds.filter(taId => !course.TAs.includes(taId));

        course.TAs.push(...newTAs);
        await course.save();

        res.status(200).json({ message : "TAs added successfulyy",course});

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

const addStudents = async (req,res) => {
    try{
        const {courseId} = req.params;
        const {students} = req.body;
        if(!students || students.length === 0) return res.status(400).json({message: "No students provided"});
        const course = await Course.findById(courseId);
        if(!course) return res.status(404).json({message: "Course not found"});
        if (course.professor.toString()!== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to add students to this course.' });
        }
        const studentIds = Array.isArray(students) ? students : [students];

        for (const studentId of studentIds) {
            const user = await User.findById(studentId);
            if (!user || user.role!== 'student') {
              return res.status(400).json({ message: `User with id ${studentId} is not a valid student.` });
            }
        }

        const newStudents = studentIds.filter(studentId => !course.students.includes(studentId));

        course.students.push(...newStudents);
        await course.save();

        res.status(200).json({ message: 'Students added successfully', course });
    }
    catch(error){
        console.error(error);
        res.status(500).json({message : error.message});
    }
}

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

module.exports = { addTAs, addStudents, getMembers };