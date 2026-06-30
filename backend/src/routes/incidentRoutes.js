const express = require('express');
const {
  getIncidents,
  getIncidentById,
  acknowledgeIncident,
  resolveIncident
} = require('../controllers/incidentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getIncidents);
router.get('/:id', getIncidentById);
router.post('/:id/acknowledge', acknowledgeIncident);
router.post('/:id/resolve', resolveIncident);

module.exports = router;
