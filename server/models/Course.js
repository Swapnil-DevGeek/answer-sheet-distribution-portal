mongoose = require('mongoose');
const { Schema } = mongoose;

const CourseSchema = new Schema({
title: {
type: String,
required: true
},
code: {
type: String,
required: true,
unique: true
},
description: {
type: String
},
professor: {
type: Schema.Types.ObjectId,
ref: 'User',
required: true
},
TAs: [{
type: Schema.Types.ObjectId,
ref: 'User'
}],
students: [{
type: Schema.Types.ObjectId,
ref: 'User'
}],
createdAt: {
type: Date,
default: Date.now()
}
});
module.exports = mongoose.model('Course', CourseSchema);