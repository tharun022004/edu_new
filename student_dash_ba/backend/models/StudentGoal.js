const mongoose = require('mongoose');

const studentGoalSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please add a goal title']
  },
  target: {
    type: Number,
    required: [true, 'Please specify a target number (e.g., number of lessons)']
  },
  progress: {
    type: Number,
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('StudentGoal', studentGoalSchema);
