const StudentGoal = require('../models/StudentGoal');

// @desc    Get student's goals
// @route   GET /api/goals
// @access  Private
exports.getGoals = async (req, res, next) => {
  try {
    const goals = await StudentGoal.find({ student: req.user.id })
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: goals.length,
      data: goals
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Create student goal
// @route   POST /api/goals
// @access  Private
exports.createGoal = async (req, res, next) => {
  try {
    req.body.student = req.user.id;
    
    const goal = await StudentGoal.create(req.body);

    res.status(201).json({
      success: true,
      data: goal
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update student goal (toggle completed/progress)
// @route   PUT /api/goals/:id
// @access  Private
exports.updateGoal = async (req, res, next) => {
  try {
    let goal = await StudentGoal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    if (goal.student.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to update this goal' });
    }

    goal = await StudentGoal.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: goal
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Delete student goal
// @route   DELETE /api/goals/:id
// @access  Private
exports.deleteGoal = async (req, res, next) => {
  try {
    const goal = await StudentGoal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    if (goal.student.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this goal' });
    }

    await goal.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
