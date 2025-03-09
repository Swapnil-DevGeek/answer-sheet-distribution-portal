const mongoose = require("mongoose");
const { Schema } = mongoose;

const AnswerSheetSchema = new Schema({
  course: {
    type: Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  student: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  examType: {
    type: String,
    enum: ["quiz", "assignment", "exam", "midterm", "final"],
    required: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  uploadDate: {
    type: Date,
    default: Date.now(),
  },
});
module.exports = mongoose.model("AnswerSheet", AnswerSheetSchema);
