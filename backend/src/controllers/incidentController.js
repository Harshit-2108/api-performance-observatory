const Incident = require('../models/Incident');
const Monitor = require('../models/Monitor');

// Helper to verify user owns the monitor referenced by the incident
const verifyIncidentOwner = async (incident, req) => {
  if (req.user.role === 'admin') return true;
  const monitor = await Monitor.findById(incident.monitorId);
  return monitor && monitor.userId.toString() === req.user.id.toString();
};

// @desc    Get all incidents
// @route   GET /api/incidents
// @access  Private
exports.getIncidents = async (req, res, next) => {
  try {
    let monitors;
    if (req.user.role === 'admin') {
      monitors = await Monitor.find();
    } else {
      monitors = await Monitor.find({ userId: req.user.id });
    }
    const monitorIds = monitors.map(m => m._id);

    // Filter query parameters
    const filter = { monitorId: { $in: monitorIds } };
    if (req.query.status) filter.status = req.query.status;

    const incidents = await Incident.find(filter)
      .sort({ downtimeStart: -1 })
      .populate('monitorId', 'name url');

    res.status(200).json({
      success: true,
      count: incidents.length,
      data: incidents
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get details of a single incident
// @route   GET /api/incidents/:id
// @access  Private
exports.getIncidentById = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id).populate('monitorId', 'name url');

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    // Verify ownership
    const isOwner = await verifyIncidentOwner(incident, req);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this incident log'
      });
    }

    res.status(200).json({
      success: true,
      data: incident
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Acknowledge an open incident
// @route   POST /api/incidents/:id/acknowledge
// @access  Private
exports.acknowledgeIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    const isOwner = await verifyIncidentOwner(incident, req);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to acknowledge this incident'
      });
    }

    if (incident.status !== 'OPEN') {
      return res.status(400).json({
        success: false,
        message: 'Incident is already acknowledged or resolved'
      });
    }

    const timestamp = new Date();
    const timelineEvent = {
      message: `Incident acknowledged by ${req.user.name}`,
      timestamp,
      type: 'ACKNOWLEDGED'
    };

    incident.status = 'ACKNOWLEDGED';
    incident.acknowledged = true;
    incident.acknowledgedAt = timestamp;
    incident.acknowledgedBy = req.user.id;
    incident.timeline.push(timelineEvent);
    await incident.save();

    res.status(200).json({
      success: true,
      message: 'Incident successfully acknowledged',
      data: incident
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve an incident manually
// @route   POST /api/incidents/:id/resolve
// @access  Private
exports.resolveIncident = async (req, res, next) => {
  try {
    const { resolutionNotes, rootCause } = req.body;

    if (!resolutionNotes || !rootCause) {
      return res.status(400).json({
        success: false,
        message: 'Please provide resolution notes and root-cause details'
      });
    }

    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    const isOwner = await verifyIncidentOwner(incident, req);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to resolve this incident'
      });
    }

    if (incident.status === 'RESOLVED') {
      return res.status(400).json({
        success: false,
        message: 'Incident is already resolved'
      });
    }

    const timestamp = new Date();
    const timelineEvent = {
      message: `Incident resolved manually by ${req.user.name}. Notes: ${resolutionNotes}`,
      timestamp,
      type: 'RESOLVED'
    };

    incident.status = 'RESOLVED';
    incident.downtimeEnd = timestamp;
    incident.resolvedBy = req.user.id;
    incident.resolutionNotes = resolutionNotes;
    incident.rootCause = rootCause;
    incident.timeline.push(timelineEvent);
    await incident.save();

    // Reset the monitor status back to UP in Mongo
    await Monitor.findByIdAndUpdate(incident.monitorId, { status: 'UP' });

    res.status(200).json({
      success: true,
      message: 'Incident successfully resolved',
      data: incident
    });
  } catch (error) {
    next(error);
  }
};
