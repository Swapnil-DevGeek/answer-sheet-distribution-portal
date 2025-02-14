const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
name: {
type: String,
required: true
},
email: {
type: String,
required: true,
unique: true
},
password: {
type: String,
required: true
},
role: {
type: String,
enum: ['super_admin', 'professor', 'ta', 'student'],
required: true
},
// courses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
createdAt: {
type: Date,
default: Date.now()
}
});

module.exports = mongoose.model('User', UserSchema);