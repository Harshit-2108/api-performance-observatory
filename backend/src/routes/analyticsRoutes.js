const express = require('express');
const {
  getDashboardStats,
  getMonitorMetrics,
  getSLAReport,
  getRegionalLatencyStats,
  getOutagePrediction,
  analyzeIncidentRootCause,
  getDeploymentTimeline
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/dashboard', getDashboardStats);
router.get('/deployments', getDeploymentTimeline);
router.get('/monitor/:monitorId', getMonitorMetrics);
router.get('/monitor/:monitorId/regional', getRegionalLatencyStats);
router.get('/monitor/:monitorId/predict', getOutagePrediction);
router.post('/incident/:incidentId/analyze', analyzeIncidentRootCause);
router.get('/sla', getSLAReport);

module.exports = router;
