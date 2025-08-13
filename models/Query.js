const mongoose = require('mongoose');

const querySchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    default: null
  },
  studentName: {
    type: String,
    required: true
  },
  studentClass: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  question: {
    type: String,
    required: true
  },
  reply: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'Answered', 'Resolved'],
    default: 'Pending'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  tags: [{
    type: String
  }],
  attachments: [{
    filename: String,
    originalName: String,
    fileSize: Number,
    mimetype: String
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  likes: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  repliedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for better query performance
querySchema.index({ studentId: 1 });
querySchema.index({ teacherId: 1 });
querySchema.index({ subject: 1 });
querySchema.index({ status: 1 });
querySchema.index({ priority: 1 });
querySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Query', querySchema);
