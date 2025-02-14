const Course = require("../models/Course");
const User = require("../models/User");

// POST /api/courses
const createCourse = async (req, res) => {
  try {
    const { title, code, description, professor } = req.body;
    if (!title || !code || !professor) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const assignedProfessor = await User.findById(professor);
    if (!assignedProfessor || assignedProfessor.role !== "professor") {
      return res.status(400).json({ message: "Invalid professor ID." });
    }

    const existingCourse = await Course.findOne({code});
    if (existingCourse) {
      return res.status(400).json({ message: "Course already exists" });
    }

    const newCourse = new Course({
      title,
      code,
      description,
      professor,
    });
    await newCourse.save();
    res.status(201).json(newCourse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/courses
const getCourses = async (req, res) => {
  try {
    const courses = await Course.find()
      .populate("professor", "name email")
      .select("-__v");
    res.json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// GET /api/courses/:id
const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate("professor", "name email")
      .populate("TAs", "name email")
      .populate("students", "name email")
      .select("-__v");
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// PUT /api/courses/:id
const updateCourse = async (req, res) => {
  try {
    const updates = req.body;
    // If updating the professor, validate the provided user ID
    if (updates.professor) {
      const assignedProfessor = await User.findById(updates.professor);
      if (!assignedProfessor || assignedProfessor.role !== "professor") {
        return res.status(400).json({ message: "Invalid professor ID." });
      }
    }

    const course = await Course.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// DELETE /api/courses/:id
const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
};
