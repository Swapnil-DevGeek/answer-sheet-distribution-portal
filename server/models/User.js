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
  roles: [{
    type: String,
    enum: ['super_admin', 'professor', 'ta', 'student'],
    required: true,
    validate: {
      validator: function(roles) {
        // Ensure admin and professor can only have one role
        if (roles.includes('super_admin') || roles.includes('professor')) {
          return roles.length === 1;
        }
        // Allow student to also be a TA
        if (roles.includes('student')) {
          return roles.every(role => ['student', 'ta'].includes(role));
        }
        return true;
      },
      message: 'Invalid role combination'
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);