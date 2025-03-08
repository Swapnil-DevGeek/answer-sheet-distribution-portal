const RecheckRequest = require("../models/RecheckRequest");
const AnswerSheet = require("../models/AnswerSheet");
const Course = require("../models/Course");

// POST /api/rechecks
// Student creates a recheck request for one of their answer sheets.
const createRecheckRequest = async (req, res) => {
  try {
    const { course, answerSheet, message } = req.body;

    if (!course || !answerSheet || !message) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const sheet = await AnswerSheet.findById(answerSheet);
    if (!sheet) {
      return res.status(404).json({ message: "Answer sheet not found." });
    }
    if (sheet.student.toString() !== req.user.id) {
      return res
        .status(403)
        .json({
          message: "You can only request a recheck for your own answer sheet.",
        });
    }

    // Create the recheck request.
    const recheck = new RecheckRequest({
      course,
      answerSheet,
      student: req.user.id,
      message,
    });
    await recheck.save();
    res.status(201).json(recheck);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/rechecks
// Retrieves a list of recheck requests. For students: only their own.
// For professors/TAs: requests for courses they manage.
const getRecheckRequests = async (req, res) => {
  try {
    if (req.user.role === "student") {
      const requests = await RecheckRequest.find({ student: req.user.id })
        .populate("course", "title code")
        .populate("answerSheet")
        .select("-__v");
      return res.json(requests);
    }

    let courseFilter = {};
    if (req.user.role === "professor") {
      const courses = await Course.find({ professor: req.user.id }).select(
        "_id"
      );
      courseFilter = { course: { $in: courses.map((c) => c._id) } };
    } else if (req.user.isTa) {
      const courses = await Course.find({ TAs: req.user.id }).select("_id");
      courseFilter = { course: { $in: courses.map((c) => c._id) } };
    }

    const requests = await RecheckRequest.find(courseFilter)
      .populate("course", "title code")
      .populate("answerSheet")
      .populate("student", "name email")
      .select("-__v");
    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/rechecks/:id
// Retrieves a single recheck request details. Authorization is verified based on role.
const getRecheckRequestById = async (req, res) => {
  try {
    const recheck = await RecheckRequest.findById(req.params.id)
      .populate("course", "title code")
      .populate("answerSheet")
      .populate("student", "name email")
      .select("-__v");

    if (!recheck) {
      return res.status(404).json({ message: "Recheck request not found." });
    }

    // Students can only access their own recheck requests.
    if (
      req.user.role === "student" &&
      recheck.student._id.toString() !== req.user.id
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this recheck request." });
    }

    // For professors and TAs, you might further check if the course is managed by them.
    if (["professor"].includes(req.user.role)) {
      const courseData = await Course.findById(recheck.course._id);
      const userId = req.user.id;
      if (
        (req.user.role === "professor" &&
          courseData.professor.toString() !== userId) ||
        (req.user.isTa &&
          !courseData.TAs.map((taId) => taId.toString()).includes(userId))
      ) {
        return res
          .status(403)
          .json({ message: "Not authorized to view this recheck request." });
      }
    }

    res.json(recheck);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/rechecks/:id
// Professors/TAs update a recheck request by adding a response and updating the status.
const updateRecheckRequest = async (req, res) => {
  try {
    const { response, status } = req.body;
    const recheck = await RecheckRequest.findById(req.params.id);
    if (!recheck) {
      return res.status(404).json({ message: "Recheck request not found." });
    }

    // Ensure that only a professor/TA assigned to the course can update the request.
    const courseData = await Course.findById(recheck.course);
    const userId = req.user.id;
    if (
      (req.user.role === "professor" &&
        courseData.professor.toString() !== userId) ||
      (req.user.isTa &&
        !courseData.TAs.map((taId) => taId.toString()).includes(userId))
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this recheck request." });
    }

    // Apply updates.
    if (response) recheck.response = response;
    if (status) recheck.status = status;
    recheck.updatedAt = Date.now();

    await recheck.save();
    res.json(recheck);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createRecheckRequest,
  getRecheckRequests,
  getRecheckRequestById,
  updateRecheckRequest,
};
