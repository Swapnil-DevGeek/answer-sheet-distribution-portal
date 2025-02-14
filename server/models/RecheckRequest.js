const mongoose = require('mongoose');
const { Schema } = mongoose;

const RecheckRequestSchema = new Schema({
course: {
type: Schema.Types.ObjectId,
ref: 'Course',
required: true
},
answerSheet: {
type: Schema.Types.ObjectId,
ref: 'AnswerSheet',
required: true
},
student: {
type: Schema.Types.ObjectId,
ref: 'User',
required: true
},
message: {
type: String,
required: true
},
response: {
type: String
},
status: {
type: String,
enum: ['pending', 'resolved'],
default: 'pending'
},
createdAt: {
type: Date,
default: Date.now()
},
updatedAt: Date
});

module.exports = mongoose.model('RecheckRequest', RecheckRequestSchema);