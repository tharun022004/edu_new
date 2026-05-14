const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  class: {
    type: mongoose.Schema.ObjectId,
    ref: 'Class',
    required: true
  },
  dayOfWeek: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true
  },
  startTime: {
    type: String, // format HH:MM
    required: true
  },
  endTime: {
    type: String, // format HH:MM
    required: true
  }
}, {
  timestamps: true
});

scheduleSchema.index({ teacher: 1, dayOfWeek: 1 });
scheduleSchema.index({ class: 1, dayOfWeek: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);
