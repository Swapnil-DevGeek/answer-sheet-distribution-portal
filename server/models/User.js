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
  roles: {
    type: [{
      type: String,
      enum: ['super_admin', 'professor', 'ta', 'student']
    }],
    required: true,
    validate: {
      validator: function(roles) {
        // Check if roles is an array
        if (!Array.isArray(roles)) return false;
        
        // Ensure there's at least one role
        if (roles.length === 0) return false;
        
        // Super admin and professor can only have one role
        if (roles.includes('super_admin') || roles.includes('professor')) {
          return roles.length === 1;
        }
        
        // Student can be a TA, but no other combinations
        if (roles.includes('student')) {
          return roles.every(role => ['student', 'ta'].includes(role));
        }
        
        // TA can exist alone or with student
        if (roles.includes('ta')) {
          return roles.every(role => ['student', 'ta'].includes(role));
        }
        return false;
      },
      message: 'Invalid role combination'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);