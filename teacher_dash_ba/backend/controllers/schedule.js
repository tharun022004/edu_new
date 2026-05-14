const Schedule = require('../models/Schedule');
const Class = require('../models/Class');

// @desc    Get teacher's schedule
// @route   GET /api/schedule
// @access  Private
exports.getSchedule = async (req, res, next) => {
  try {
    const schedule = await Schedule.find({ teacher: req.user.id })
      .populate('class', 'name subject grade')
      .sort('startTime');

    res.status(200).json({
      success: true,
      count: schedule.length,
      data: schedule
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Create schedule item
// @route   POST /api/schedule
// @access  Private
exports.createSchedule = async (req, res, next) => {
  try {
    req.body.teacher = req.user.id;
    
    // verify teacher owns the class or class exists
    const classExists = await Class.findById(req.body.class);
    if (!classExists) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    const scheduleItem = await Schedule.create(req.body);

    const populatedItem = await Schedule.findById(scheduleItem._id).populate('class', 'name subject grade');

    res.status(201).json({
      success: true,
      data: populatedItem
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update schedule item
// @route   PUT /api/schedule/:id
// @access  Private
exports.updateSchedule = async (req, res, next) => {
  try {
    let scheduleItem = await Schedule.findById(req.params.id);

    if (!scheduleItem) {
      return res.status(404).json({ success: false, message: 'Schedule item not found' });
    }

    if (scheduleItem.teacher.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to update this schedule' });
    }

    scheduleItem = await Schedule.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('class', 'name subject grade');

    res.status(200).json({
      success: true,
      data: scheduleItem
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Delete schedule item
// @route   DELETE /api/schedule/:id
// @access  Private
exports.deleteSchedule = async (req, res, next) => {
  try {
    const scheduleItem = await Schedule.findById(req.params.id);

    if (!scheduleItem) {
      return res.status(404).json({ success: false, message: 'Schedule item not found' });
    }

    if (scheduleItem.teacher.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this schedule' });
    }

    await scheduleItem.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
