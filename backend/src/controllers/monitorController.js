const Monitor = require('../models/Monitor');

// Helper to check user ownership or admin privileges
const verifyOwnership = (monitor, req) => {
  const monitorOwnerId = monitor.userId ? monitor.userId.toString() : '';
  const requestUserId = req.user.id ? req.user.id.toString() : '';
  return monitorOwnerId === requestUserId || req.user.role === 'admin';
};

// @desc    Create a new API monitor
// @route   POST /api/monitors
// @access  Private
exports.createMonitor = async (req, res, next) => {
  try {
    const {
      name,
      url,
      method,
      headers,
      body,
      interval,
      timeout,
      threshold,
      expectedStatus,
      description,
      tags
    } = req.body;

    if (!name || !url) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a monitor name and URL'
      });
    }

    const monitor = await Monitor.create({
      name,
      url,
      method: method || 'GET',
      headers: headers || {},
      body: body || '',
      interval: interval || 5,
      timeout: timeout || 5000,
      threshold: threshold || 3,
      expectedStatus: expectedStatus || 200,
      description: description || '',
      tags: tags || [],
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      data: monitor
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all monitored endpoints
// @route   GET /api/monitors
// @access  Private
exports.getMonitors = async (req, res, next) => {
  try {
    let monitors;

    if (req.user.role === 'admin') {
      monitors = await Monitor.find();
    } else {
      monitors = await Monitor.find({ userId: req.user.id });
    }

    res.status(200).json({
      success: true,
      count: monitors.length,
      data: monitors
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get details of a single monitor
// @route   GET /api/monitors/:id
// @access  Private
exports.getMonitorById = async (req, res, next) => {
  try {
    const monitor = await Monitor.findById(req.params.id);

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }

    // Verify owner
    if (!verifyOwnership(monitor, req)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this monitor'
      });
    }

    res.status(200).json({
      success: true,
      data: monitor
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a monitor
// @route   PUT /api/monitors/:id
// @access  Private
exports.updateMonitor = async (req, res, next) => {
  try {
    let monitor = await Monitor.findById(req.params.id);

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }

    // Verify owner
    if (!verifyOwnership(monitor, req)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this monitor'
      });
    }

    const updateFields = req.body;
    // Prevent userId updates
    delete updateFields.userId;

    monitor = await Monitor.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: monitor
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a monitor
// @route   DELETE /api/monitors/:id
// @access  Private
exports.deleteMonitor = async (req, res, next) => {
  try {
    const monitor = await Monitor.findById(req.params.id);

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }

    // Verify owner
    if (!verifyOwnership(monitor, req)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this monitor'
      });
    }

    await Monitor.findByIdAndDelete(req.params.id);
    
    // Clean up metrics and incidents associated with this monitor
    const Metric = require('../models/Metric');
    const Incident = require('../models/Incident');
    await Metric.deleteMany({ monitorId: req.params.id });
    await Incident.deleteMany({ monitorId: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Monitor successfully deleted'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger manual check for a monitor
// @route   POST /api/monitors/:id/check
// @access  Private
exports.triggerManualCheck = async (req, res, next) => {
  try {
    const monitor = await Monitor.findById(req.params.id);

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }

    // Verify owner
    if (!verifyOwnership(monitor, req)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to check this monitor'
      });
    }

    const { checkEndpoint } = require('../services/monitorEngine');
    const checkResult = await checkEndpoint(monitor);

    // Fetch updated monitor to capture lastChecked and status updates
    const updatedMonitor = await Monitor.findById(req.params.id);

    res.status(200).json({
      success: true,
      checkResult,
      data: updatedMonitor
    });
  } catch (error) {
    next(error);
  }
};
