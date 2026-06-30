const express = require('express');
const {
  createMonitor,
  getMonitors,
  getMonitorById,
  updateMonitor,
  deleteMonitor,
  triggerManualCheck
} = require('../controllers/monitorController');
const { protect } = require('../middleware/auth');
const { validateMonitor } = require('../middleware/validator');

const router = express.Router();

// Apply auth protection middleware to all endpoints in this route file
router.use(protect);

router
  .route('/')
  .post(validateMonitor, createMonitor)
  .get(getMonitors);

router
  .route('/:id')
  .get(getMonitorById)
  .put(validateMonitor, updateMonitor)
  .delete(deleteMonitor);

router.post('/:id/check', triggerManualCheck);

module.exports = router;
