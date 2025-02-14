const mongoose = require('mongoose');
const { Schema } = mongoose;

const AnswerSheetSchema = new Schema({
course: {
type: Schema.Types.ObjectId,
ref: 'Course',
required: true
},
student: {
type: Schema.Types.ObjectId,
ref: 'User',
required: true
},
uploadedBy: {
type: Schema.Types.ObjectId,
ref: 'User',
required: true
},
examType: {
type: String,
enum: ['quiz', 'midsem', 'compre'],
required: true
},
fileUrl: {
type: String,
required: true
},
uploadDate: {
type: Date,
default: Date.now()
}
});
module.exports = mongoose.model('AnswerSheet', AnswerSheetSchema);