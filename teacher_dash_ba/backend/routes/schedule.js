const express = require('express');
const router = express.Router();
const {
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule
} = require('../controllers/schedule');

const { protect } = require('../middleware/auth');

router.use(protect);

router
  .route('/')
  .get(getSchedule)
  .post(createSchedule);

router
  .route('/:id')
  .put(updateSchedule)
  .delete(deleteSchedule);

module.exports = router;
