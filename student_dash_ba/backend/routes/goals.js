const express = require('express');
const router = express.Router();
const {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal
} = require('../controllers/goals');

const { protect } = require('../middleware/auth');

router.use(protect);

router
  .route('/')
  .get(getGoals)
  .post(createGoal);

router
  .route('/:id')
  .put(updateGoal)
  .delete(deleteGoal);

module.exports = router;
