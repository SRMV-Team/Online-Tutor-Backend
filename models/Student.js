// const mongoose = require("mongoose");

// const studentSchema = new mongoose.Schema({
//   salutation: String,
//   firstName: String,
//   lastName: String,
//   mobile: String,
//   timezone: String,
//   email: { type: String, unique: true },
//   password: String,
//   class: String,
//   group: String,
//   syllabus: String
// });

// module.exports = mongoose.model("Student", studentSchema);



const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  salutation: {
    type: String,
    enum: ['Mr.', 'Ms.', 'Mrs.', ''],
    default: ''
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    // Not required for admin-created students
  },
  mobile: {
    type: String,
    trim: true
  },
  timezone: String,
  class: {
    type: String,
    required: true
  },
  group: String,
  syllabus: String,
  emisNumber: {
    type: String,
    trim: true
  },
  proof: String, // File path for student proof document
  registeredAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Paid', 'Unpaid'],
    default: 'Unpaid'
  },
  approvalStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better query performance
studentSchema.index({ email: 1 });
studentSchema.index({ approvalStatus: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ class: 1 });

module.exports = mongoose.model('Student', studentSchema);
