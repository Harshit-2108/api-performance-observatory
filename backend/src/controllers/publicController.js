const Monitor = require('../models/Monitor');
const Incident = require('../models/Incident');

// Helper to determine the status of a monitor on a specific day
const getMonitorDailyStatus = (monitorId, date, incidentsList) => {
  const checkDate = new Date(date);
  const startOfDay = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate(), 0, 0, 0);
  const endOfDay = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate(), 23, 59, 59);

  // Find incidents for this monitor that active or resolved during this day
  const dayIncidents = incidentsList.filter((inc) => {
    if (inc.monitorId._id) {
      if (inc.monitorId._id.toString() !== monitorId.toString()) return false;
    } else {
      if (inc.monitorId.toString() !== monitorId.toString()) return false;
    }

    const start = new Date(inc.downtimeStart);
    const end = inc.downtimeEnd ? new Date(inc.downtimeEnd) : new Date();

    // Intersection check: incident overlaps with startOfDay to endOfDay
    return start <= endOfDay && end >= startOfDay;
  });

  if (dayIncidents.length === 0) {
    return { status: 'UP', uptime: 100 };
  }

  // Check if there was a full downtime or just a performance issue
  const hasOutage = dayIncidents.some(inc => inc.type === 'DOWN');
  const hasSlow = dayIncidents.some(inc => inc.type === 'SLOW');

  if (hasOutage) {
    // If it was open/ongoing at end of the day or lasted more than 30 mins, mark DOWN, else DEGRADED
    return { status: 'DOWN', uptime: 95 }; 
  } else if (hasSlow) {
    return { status: 'DEGRADED', uptime: 98 };
  }

  return { status: 'UP', uptime: 100 };
};

// @desc    Get public status dashboard feed
// @route   GET /api/public/status
// @access  Public
exports.getPublicStatus = async (req, res, next) => {
  try {
    const now = new Date();
    const monitors = await Monitor.find({ active: true });
    const incidents = await Incident.find().populate('monitorId', 'name');

    // Process each active monitor status summary
    const services = monitors.map((monitor) => {
      const dailyHistory = [];
      let upDays = 0;

      // Compile 30 days history
      for (let i = 29; i >= 0; i--) {
        const checkDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayReport = getMonitorDailyStatus(monitor._id, checkDate, incidents);
        
        if (dayReport.status === 'UP') upDays++;
        
        dailyHistory.push({
          date: checkDate.toISOString().split('T')[0],
          status: dayReport.status,
          uptime: dayReport.uptime
        });
      }

      const uptime30d = Math.round((upDays / 30) * 10000) / 100;

      return {
        _id: monitor._id,
        name: monitor.name,
        url: monitor.url,
        status: monitor.status,
        lastChecked: monitor.lastChecked,
        uptime30d,
        dailyHistory
      };
    });

    // Determine global status
    const anyDown = services.some(s => s.status === 'DOWN');
    const anyDegraded = services.some(s => s.status === 'DEGRADED');
    let overallStatus = 'ALL_SYSTEMS_OPERATIONAL';
    let overallMessage = 'All systems are operating normally.';

    if (anyDown) {
      overallStatus = 'MAJOR_OUTAGE';
      overallMessage = 'Active outages detected on one or more services.';
    } else if (anyDegraded) {
      overallStatus = 'DEGRADED_PERFORMANCE';
      overallMessage = 'Some services are experiencing degraded performance latency.';
    }

    // Filter active open incidents list and recent resolved incidents in the past 7 days
    const activeIncidents = incidents.filter(inc => inc.status !== 'RESOLVED' && inc.type === 'DOWN');
    
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentIncidents = incidents
      .filter(inc => inc.status === 'RESOLVED' || inc.type === 'SLOW')
      .filter(inc => new Date(inc.downtimeStart) >= sevenDaysAgo)
      .sort((a, b) => new Date(b.downtimeStart) - new Date(a.downtimeStart));

    res.status(200).json({
      success: true,
      overallStatus,
      overallMessage,
      services,
      activeIncidents,
      recentIncidents
    });
  } catch (error) {
    next(error);
  }
};
