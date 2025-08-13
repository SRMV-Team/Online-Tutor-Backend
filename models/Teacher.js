// models/Teacher.js
const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  salutation: String,
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: String,
  timezone: String,
  password: { type: String, required: true },
  preferredSubjects: [String], // Changed to array for multiple subjects
  proof: String, // stores uploaded file name
  isApproved: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  classAssigned: String, // Keep for backward compatibility
  classesAssigned: [String], // Support multiple classes
  subjects: [String], // Assigned subjects
  joiningDate: {
    type: Date,
    default: Date.now
  },
  experience: String,
  qualification: String,
  notes: String // Admin notes
}, {
  timestamps: true // Adds createdAt and updatedAt
});

module.exports = mongoose.model('Teacher', teacherSchema);
