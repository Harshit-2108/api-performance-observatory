const Monitor = require('../models/Monitor');
const Metric = require('../models/Metric');
const Incident = require('../models/Incident');
const DeploymentEvent = require('../models/DeploymentEvent');
const aiService = require('../services/aiService');
const aiRootCauseService = require('../services/aiRootCauseService');

// Helper to aggregate hourly metric trend datasets in-memory
const buildLatencyTrend = (monitors, metrics) => {
  const trend = [];
  const now = Date.now();

  for (let i = 24; i >= 0; i--) {
    const bucketTime = new Date(now - i * 60 * 60 * 1000);
    
    // Format hour (e.g. 14:00)
    const hourStr = bucketTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const startWindow = new Date(bucketTime);
    startWindow.setMinutes(0, 0, 0);
    const endWindow = new Date(startWindow);
    endWindow.setHours(endWindow.getHours() + 1);

    const bucket = { time: hourStr };

    monitors.forEach((m) => {
      const cellMetrics = metrics.filter(
        (metric) =>
          metric.monitorId.toString() === m._id.toString() &&
          new Date(metric.timestamp).getTime() >= startWindow.getTime() &&
          new Date(metric.timestamp).getTime() < endWindow.getTime()
      );

      if (cellMetrics.length > 0) {
        const avg = cellMetrics.reduce((sum, met) => sum + met.responseTime, 0) / cellMetrics.length;
        bucket[m.name] = Math.round(avg);
      } else {
        // Fallback: look for the last recorded metric prior to this hour to draw continuous chart lines
        const pastMetrics = metrics
          .filter((metric) => metric.monitorId.toString() === m._id.toString() && new Date(metric.timestamp).getTime() < endWindow.getTime())
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        bucket[m.name] = pastMetrics.length > 0 ? pastMetrics[0].responseTime : null;
      }
    });

    trend.push(bucket);
  }
  return trend;
};

// @desc    Get dashboard summaries and trend chart data
// @route   GET /api/analytics/dashboard
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    let monitors = [];
    const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Fetch user monitors
    if (req.user.role === 'admin') {
      monitors = await Monitor.find();
    } else {
      monitors = await Monitor.find({ userId: req.user.id });
    }

    const monitorIds = monitors.map((m) => m._id);

    // 2. Fetch metrics
    const metrics = await Metric.find({
      monitorId: { $in: monitorIds },
      timestamp: { $gte: past24h }
    });

    // 3. Fetch incidents
    const incidents = await Incident.find({
      monitorId: { $in: monitorIds }
    })
      .sort({ downtimeStart: -1 })
      .limit(5)
      .populate('monitorId', 'name');

    // Calculations
    const totalChecks = metrics.length;
    const successfulChecks = metrics.filter((m) => m.isUp).length;
    
    // Overall Uptime Index
    const uptimePercentage = totalChecks > 0 
      ? Math.round((successfulChecks / totalChecks) * 10000) / 100 
      : 100;

    // Average Response Latency
    const avgResponseTime = totalChecks > 0
      ? Math.round(metrics.reduce((sum, m) => sum + m.responseTime, 0) / totalChecks)
      : 0;

    // Build hourly latency data
    const latencyTrend = buildLatencyTrend(monitors, metrics);

    // Build monitor-specific uptime distribution for bar charts
    const monitorUptime = monitors.map((m) => {
      const monitorMetrics = metrics.filter((metric) => metric.monitorId.toString() === m._id.toString());
      const checksCount = monitorMetrics.length;
      const upCount = monitorMetrics.filter((met) => met.isUp).length;
      const uptime = checksCount > 0 ? Math.round((upCount / checksCount) * 1000) / 10 : m.active ? 100 : 0;
      
      return {
        name: m.name,
        uptime,
        status: m.status,
        active: m.active
      };
    });

    res.status(200).json({
      success: true,
      stats: {
        uptimePercentage,
        avgResponseTime,
        totalMonitors: monitors.length,
        activeMonitors: monitors.filter((m) => m.active).length,
        incidentsCount: monitors.filter((m) => m.status === 'DOWN' && m.active).length
      },
      recentIncidents: incidents,
      latencyTrend,
      monitorUptime
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get metrics history for a selected monitor
// @route   GET /api/analytics/monitor/:monitorId
// @access  Private
exports.getMonitorMetrics = async (req, res, next) => {
  try {
    const { monitorId } = req.params;

    // Verify ownership of the monitor first
    const monitor = await Monitor.findById(monitorId);

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }

    if (monitor.userId.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view metrics for this monitor'
      });
    }

    const metrics = await Metric.find({ monitorId })
      .sort({ timestamp: -1 })
      .limit(100); // return past 100 readings

    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get SLA report calculations for a specific month
// @route   GET /api/analytics/sla
// @access  Private
exports.getSLAReport = async (req, res, next) => {
  try {
    const { month, monitorId } = req.query;
    
    // Parse month YYYY-MM
    let year, monthIdx;
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const parts = month.split('-');
      year = parseInt(parts[0]);
      monthIdx = parseInt(parts[1]) - 1;
    } else {
      const now = new Date();
      year = now.getFullYear();
      monthIdx = now.getMonth();
    }

    const startOfMonth = new Date(year, monthIdx, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);
    
    const limitDate = new Date();
    const effectiveEnd = endOfMonth > limitDate ? limitDate : endOfMonth;

    const totalTimeMs = effectiveEnd.getTime() - startOfMonth.getTime();
    let totalTimeMins = Math.round(totalTimeMs / (60 * 1000));
    if (totalTimeMins <= 0) totalTimeMins = 1; // Safeguard

    let query = {};
    if (req.user.role !== 'admin') {
      query.userId = req.user.id;
    }
    if (monitorId) {
      query._id = monitorId;
    }
    const monitors = await Monitor.find(query);
    const mIds = monitors.map(m => m._id);

    // Fetch incidents for these monitors intersecting the month
    const incidents = await Incident.find({
      monitorId: { $in: mIds },
      type: 'DOWN',
      downtimeStart: { $lte: effectiveEnd },
      $or: [
        { downtimeEnd: { $gte: startOfMonth } },
        { downtimeEnd: null }
      ]
    });

    const reports = monitors.map(monitor => {
      // Find incidents for this monitor
      const monIncidents = incidents.filter(inc => {
        const id = inc.monitorId._id ? inc.monitorId._id.toString() : inc.monitorId.toString();
        return id === monitor._id.toString();
      });

      let totalDowntimeMins = 0;
      let failureCount = monIncidents.length;

      monIncidents.forEach(inc => {
        const start = new Date(inc.downtimeStart);
        const end = inc.downtimeEnd ? new Date(inc.downtimeEnd) : new Date();

        const intersectStart = Math.max(start.getTime(), startOfMonth.getTime());
        const intersectEnd = Math.min(end.getTime(), effectiveEnd.getTime());

        if (intersectEnd > intersectStart) {
          totalDowntimeMins += (intersectEnd - intersectStart) / (60 * 1000);
        }
      });

      totalDowntimeMins = Math.round(totalDowntimeMins);
      let uptime = ((totalTimeMins - totalDowntimeMins) / totalTimeMins) * 100;
      uptime = Math.max(0, Math.min(100, Math.round(uptime * 1000) / 1000));

      // MTTR: downtime / failures
      let mttr = failureCount > 0 ? Math.round(totalDowntimeMins / failureCount) : 0;

      // MTBF: (operating time - downtime) / failures
      const operatingTime = totalTimeMins - totalDowntimeMins;
      let mtbf = failureCount > 0 ? Math.round(operatingTime / failureCount) : totalTimeMins;

      return {
        monitorId: monitor._id,
        monitorName: monitor.name,
        url: monitor.url,
        uptime,
        downtime: totalDowntimeMins,
        incidentsCount: failureCount,
        mttr,
        mtbf
      };
    });

    // Global summary
    const count = reports.length;
    const globalSummary = {
      averageUptime: count > 0 ? Math.round((reports.reduce((sum, r) => sum + r.uptime, 0) / count) * 1000) / 1000 : 100,
      totalDowntime: reports.reduce((sum, r) => sum + r.downtime, 0),
      totalIncidents: reports.reduce((sum, r) => sum + r.incidentsCount, 0),
      averageMTTR: count > 0 ? Math.round(reports.reduce((sum, r) => sum + r.mttr, 0) / count) : 0,
      averageMTBF: count > 0 ? Math.round(reports.reduce((sum, r) => sum + r.mtbf, 0) / count) : totalTimeMins
    };

    res.status(200).json({
      success: true,
      month: `${year}-${String(monthIdx + 1).padStart(2, '0')}`,
      totalTimeMins,
      reports,
      globalSummary
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get regional latency stats for a monitor (past 24h)
// @route   GET /api/analytics/monitor/:monitorId/regional
// @access  Private
exports.getRegionalLatencyStats = async (req, res, next) => {
  try {
    const { monitorId } = req.params;

    // Verify ownership
    const monitor = await Monitor.findById(monitorId);

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }

    if (monitor.userId.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view metrics for this monitor'
      });
    }

    const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const metrics = await Metric.find({
      monitorId,
      timestamp: { $gte: past24h }
    }).sort({ timestamp: 1 });

    // Filter to only successful checks (uptime latency measurements)
    const successMetrics = metrics.filter(m => m.isUp && m.regionalLatency);

    // Calculate regional averages
    let averages = { us: 0, eu: 0, in: 0, as: 0 };
    const count = successMetrics.length;

    if (count > 0) {
      averages.us = Math.round(successMetrics.reduce((sum, m) => sum + (m.regionalLatency.us || 0), 0) / count);
      averages.eu = Math.round(successMetrics.reduce((sum, m) => sum + (m.regionalLatency.eu || 0), 0) / count);
      averages.in = Math.round(successMetrics.reduce((sum, m) => sum + (m.regionalLatency.in || 0), 0) / count);
      averages.as = Math.round(successMetrics.reduce((sum, m) => sum + (m.regionalLatency.as || 0), 0) / count);
    }

    // Compile time series (hourly aggregates)
    const regionalTrend = [];
    const now = Date.now();

    for (let i = 24; i >= 0; i--) {
      const bucketTime = new Date(now - i * 60 * 60 * 1000);
      
      const hourStr = bucketTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      const startWindow = new Date(bucketTime);
      startWindow.setMinutes(0, 0, 0);
      const endWindow = new Date(startWindow);
      endWindow.setHours(endWindow.getHours() + 1);

      const bucketMetrics = successMetrics.filter(m => {
        const time = new Date(m.timestamp).getTime();
        return time >= startWindow.getTime() && time < endWindow.getTime();
      });

      const bucket = { time: hourStr, us: null, eu: null, in: null, as: null };

      if (bucketMetrics.length > 0) {
        bucket.us = Math.round(bucketMetrics.reduce((sum, m) => sum + (m.regionalLatency.us || 0), 0) / bucketMetrics.length);
        bucket.eu = Math.round(bucketMetrics.reduce((sum, m) => sum + (m.regionalLatency.eu || 0), 0) / bucketMetrics.length);
        bucket.in = Math.round(bucketMetrics.reduce((sum, m) => sum + (m.regionalLatency.in || 0), 0) / bucketMetrics.length);
        bucket.as = Math.round(bucketMetrics.reduce((sum, m) => sum + (m.regionalLatency.as || 0), 0) / bucketMetrics.length);
      } else {
        // Continuous line drawing fallback
        const past = successMetrics
          .filter(m => new Date(m.timestamp).getTime() < endWindow.getTime())
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        if (past.length > 0) {
          bucket.us = past[0].regionalLatency.us || null;
          bucket.eu = past[0].regionalLatency.eu || null;
          bucket.in = past[0].regionalLatency.in || null;
          bucket.as = past[0].regionalLatency.as || null;
        }
      }

      regionalTrend.push(bucket);
    }

    res.status(200).json({
      success: true,
      monitorName: monitor.name,
      averages,
      regionalTrend
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get AI outage prediction forecast for a monitor
// @route   GET /api/analytics/monitor/:monitorId/predict
// @access  Private
exports.getOutagePrediction = async (req, res, next) => {
  try {
    const { monitorId } = req.params;

    // Verify ownership
    const monitor = await Monitor.findById(monitorId);

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }

    if (monitor.userId.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view analytics for this monitor'
      });
    }

    // Retrieve metrics list
    const metrics = await Metric.find({ monitorId }).sort({ timestamp: 1 });

    // Call prediction service
    const forecast = await aiService.predictOutage(metrics);

    res.status(200).json({
      success: true,
      monitorName: monitor.name,
      prediction: forecast
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Run AI post-mortem root cause analysis on an incident
// @route   POST /api/analytics/incident/:incidentId/analyze
// @access  Private
exports.analyzeIncidentRootCause = async (req, res, next) => {
  try {
    const { incidentId } = req.params;

    const incident = await Incident.findById(incidentId);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    // Verify ownership of the referenced monitor
    const monitor = await Monitor.findById(incident.monitorId);

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Associated monitor not found'
      });
    }

    if (monitor.userId.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to analyze this incident'
      });
    }

    // Retrieve metrics recorded around the incident time (e.g. 15 checks prior to downtimeStart)
    const startTime = new Date(incident.downtimeStart).getTime();
    
    const metrics = await Metric.find({
      monitorId: incident.monitorId,
      timestamp: { $lte: new Date(startTime) }
    })
      .sort({ timestamp: -1 })
      .limit(15);
    metrics.reverse(); // sort chronologically

    // Call SRE root cause service
    const analysis = await aiRootCauseService.analyzeIncident(incident, monitor, metrics);

    res.status(200).json({
      success: true,
      analysis
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get GitHub deployments timeline and performance correlation metrics
// @route   GET /api/analytics/deployments
// @access  Private
exports.getDeploymentTimeline = async (req, res, next) => {
  try {
    // 1. Fetch all deployment events
    const events = await DeploymentEvent.find({}).sort({ timestamp: -1 });

    // 2. Fetch all incidents and monitors for cross-correlation logic
    const incidents = await Incident.find({});
    const monitors = await Monitor.find({});

    // 3. Perform correlation mapping
    const annotatedEvents = await Promise.all(events.map(async (event) => {
      const eventTime = new Date(event.timestamp).getTime();
      const eventData = event.toObject ? event.toObject() : { ...event };
      
      // Match by repository tags to correlate with specific monitor configurations
      const matchedMonitor = monitors.find(m => 
        (m.tags || []).some(t => t.toLowerCase() === event.repository.toLowerCase()) ||
        m.name.toLowerCase().includes(event.repository.toLowerCase())
      );

      // A. Outage Incident Correlation: occurred within 15 minutes of the event
      const correlatedIncident = incidents.find(inc => {
        // If the incident belongs to the matched monitor
        const isSameMonitor = matchedMonitor && inc.monitorId.toString() === matchedMonitor._id.toString();
        const timeDiff = Math.abs(new Date(inc.downtimeStart).getTime() - eventTime);
        return isSameMonitor && timeDiff <= 15 * 60 * 1000; // 15 minutes window
      });

      if (correlatedIncident) {
        eventData.incidentCorrelation = {
          incidentId: correlatedIncident._id,
          message: correlatedIncident.message,
          status: correlatedIncident.status,
          downtimeStart: correlatedIncident.downtimeStart,
          monitorName: matchedMonitor ? matchedMonitor.name : 'Unknown API'
        };
      }

      // B. Latency Spike Correlation (check metrics before vs after)
      if (matchedMonitor) {
        // 3 checks immediately before event
        const metricsBefore = await Metric.find({
          monitorId: matchedMonitor._id,
          timestamp: { $lt: new Date(eventTime) }
        }).sort({ timestamp: -1 }).limit(3);
        
        // 3 checks immediately after event (within 30 mins)
        const metricsAfter = await Metric.find({
          monitorId: matchedMonitor._id,
          timestamp: { $gte: new Date(eventTime), $lte: new Date(eventTime + 30 * 60 * 1000) }
        }).sort({ timestamp: 1 }).limit(3);

        if (metricsBefore.length > 0 && metricsAfter.length > 0) {
          const avgBefore = metricsBefore.reduce((s, m) => s + (m.responseTime || 0), 0) / metricsBefore.length;
          const avgAfter = metricsAfter.reduce((s, m) => s + (m.responseTime || 0), 0) / metricsAfter.length;
          
          if (avgAfter > avgBefore * 1.3) { // 30%+ increase
            eventData.latencyCorrelation = {
              monitorName: matchedMonitor.name,
              before: Math.round(avgBefore),
              after: Math.round(avgAfter),
              growth: Math.round(((avgAfter - avgBefore) / avgBefore) * 100)
            };
          }
        }
      }

      return eventData;
    }));

    res.status(200).json({
      success: true,
      events: annotatedEvents
    });
  } catch (error) {
    next(error);
  }
};
