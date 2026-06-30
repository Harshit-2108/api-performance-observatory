const cron = require('node-cron');
const axios = require('axios');
const Monitor = require('../models/Monitor');
const Metric = require('../models/Metric');
const Incident = require('../models/Incident');
const User = require('../models/User');
const emailService = require('./emailService');

// Helper to delay execution (for retries)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Execute target API health checks with retry loops
const checkEndpoint = async (monitor) => {
  const threshold = monitor.threshold || 3;
  let attempts = 0;
  let success = false;
  let responseTime = 0;
  let statusCode = 0;
  let errorMessage = '';

  // 1. Fetch user to evaluate preference configs
  let user;
  try {
    user = await User.findById(monitor.userId);
  } catch (err) {
    console.error('[Engine] User fetch error:', err.message);
  }

  if (!user) {
    user = {
      email: 'admin@observatory.local',
      name: 'Observatory Admin',
      notificationPreferences: { emailEnabled: true, slowThreshold: 1500 }
    };
  }

  while (attempts < threshold && !success) {
    attempts++;
    const startTime = process.hrtime();
    
    try {
      // Parse headers from Mongoose Map or normal JS object
      let headersObj = {};
      if (monitor.headers) {
        headersObj = typeof monitor.headers.toJSON === 'function' 
          ? monitor.headers.toJSON() 
          : Object.fromEntries(monitor.headers);
      }

      const response = await axios({
        method: monitor.method || 'GET',
        url: monitor.url,
        headers: headersObj,
        data: monitor.body || null,
        timeout: monitor.timeout || 5000,
        validateStatus: () => true // Allow any status code, validate manually
      });

      const diff = process.hrtime(startTime);
      responseTime = Math.round((diff[0] * 1e9 + diff[1]) / 1e6); // duration in ms
      statusCode = response.status;

      if (statusCode === (monitor.expectedStatus || 200)) {
        success = true;
      } else {
        errorMessage = `Expected status ${monitor.expectedStatus || 200}, got ${statusCode}`;
      }
    } catch (error) {
      const diff = process.hrtime(startTime);
      responseTime = Math.round((diff[0] * 1e9 + diff[1]) / 1e6);
      
      statusCode = error.response ? error.response.status : 0;
      errorMessage = error.code === 'ECONNABORTED' 
        ? `Request timeout exceeding ${monitor.timeout || 5000}ms` 
        : error.message || 'Connection failed';

      // Log retries for diagnostics
      console.log(`[Engine] Check failed for "${monitor.name}" (Attempt ${attempts}/${threshold}): ${errorMessage}`);
    }

    if (!success && attempts < threshold) {
      await delay(1000); // 1-second interval delay between consecutive retries
    }
  }

  // Update states and register metrics/incidents
  const previousStatus = monitor.status || 'UP';
  const nextStatus = success ? 'UP' : 'DOWN';
  const timestamp = new Date();

  const regionalLatency = {
    us: success ? Math.round(responseTime * (0.7 + Math.random() * 0.4)) : 0,
    eu: success ? Math.round(responseTime * (1.1 + Math.random() * 0.3)) : 0,
    in: success ? Math.round(responseTime * (0.9 + Math.random() * 0.2)) : 0,
    as: success ? Math.round(responseTime * (1.2 + Math.random() * 0.4)) : 0
  };

  // Save raw Metric entry
  await Metric.create({
    monitorId: monitor._id,
    timestamp,
    responseTime,
    status: statusCode,
    isUp: success,
    regionalLatency
  });

  // Update Monitor record
  await Monitor.findByIdAndUpdate(monitor._id, {
    status: nextStatus,
    lastChecked: timestamp
  });

  // Handle Incident Transitions & Alert Emails
  if (previousStatus === 'UP' && nextStatus === 'DOWN') {
    // Incident Opened!
    const msg = `Monitor "${monitor.name}" failed: ${errorMessage}`;
    console.log(`[ALERT] OPENING INCIDENT: ${msg}`);

    const timelineEvent = {
      message: `Outage detected: ${errorMessage}`,
      timestamp,
      type: 'TRIGGERED'
    };

    await Incident.create({
      monitorId: monitor._id,
      status: 'OPEN',
      type: 'DOWN',
      message: msg,
      downtimeStart: timestamp,
      timeline: [timelineEvent]
    });

    // Dispatch Outage Email Alert
    emailService.sendAlertEmail(user, monitor, 'OUTAGE', msg).catch((err) => {
      console.error('[Engine] Outage alert email error:', err.message);
    });

  } else if (previousStatus === 'DOWN' && nextStatus === 'UP') {
    // Incident Resolved!
    const msg = `Operational check recovered with status ${statusCode} in ${responseTime}ms.`;
    console.log(`[ALERT] RESOLVING INCIDENT for "${monitor.name}"`);

    const timelineEvent = {
      message: `Endpoint recovered: status code ${statusCode} received in ${responseTime}ms.`,
      timestamp,
      type: 'RESOLVED'
    };

    const openIncident = await Incident.findOne({ monitorId: monitor._id, status: 'OPEN' });
    if (openIncident) {
      openIncident.status = 'RESOLVED';
      openIncident.downtimeEnd = timestamp;
      openIncident.timeline.push(timelineEvent);
      await openIncident.save();
    }

    // Dispatch Recovery Email Alert
    emailService.sendAlertEmail(user, monitor, 'RECOVERY', msg).catch((err) => {
      console.error('[Engine] Recovery alert email error:', err.message);
    });
  }

  // Handle Performance Warning (Slow checks)
  const slowThreshold = user.notificationPreferences?.slowThreshold || 1500;
  if (success && responseTime > slowThreshold) {
    const msg = `Latency of ${responseTime}ms exceeded warn limit of ${slowThreshold}ms.`;
    console.log(`[ALERT] PERFORMANCE WARNING on "${monitor.name}": ${msg}`);

    const timelineEvent = {
      message: `Performance spike: latency of ${responseTime}ms exceeded warning limit of ${slowThreshold}ms.`,
      timestamp,
      type: 'TRIGGERED'
    };

    // Register a performance incident warning for tracking history logs
    await Incident.create({
      monitorId: monitor._id,
      status: 'RESOLVED', // instantly closed since it's a transient spike alert
      type: 'SLOW',
      message: msg,
      downtimeStart: timestamp,
      downtimeEnd: timestamp,
      timeline: [timelineEvent]
    });

    // Dispatch Slow Performance Alert Email
    emailService.sendAlertEmail(user, monitor, 'SLOW_RESPONSE', msg).catch((err) => {
      console.error('[Engine] Performance alert email error:', err.message);
    });
  }

  return {
    success,
    responseTime,
    status: statusCode,
    errorMessage
  };
};

// Scheduler Runner loop checking active targets
const runMonitoringCycle = async () => {
  try {
    const activeMonitors = await Monitor.find({ active: true });
    const now = Date.now();
    for (const monitor of activeMonitors) {
      const lastCheckTime = monitor.lastChecked 
        ? new Date(monitor.lastChecked).getTime() 
        : 0;
      
      const intervalMs = (monitor.interval || 5) * 60 * 1000;

      // Run check if interval has elapsed or never checked yet
      if (now - lastCheckTime >= intervalMs || !monitor.lastChecked) {
        console.log(`[Engine] Scheduling health check for "${monitor.name}" (${monitor.url})`);
        checkEndpoint(monitor).catch(err => {
          console.error(`[Engine] Error running check on "${monitor.name}":`, err.message);
        });
      }
    }
  } catch (error) {
    console.error('[Engine] Scheduler failure:', error.message);
  }
};

const startMonitoringEngine = () => {
  console.log('[Engine] Monitoring Engine Initialized.');
  
  // Run master loop check every 1 minute
  cron.schedule('* * * * *', () => {
    console.log('[Engine] Running scheduled monitoring check cycle...');
    runMonitoringCycle();
  });

  // Execute an immediate initial sweep on startup after a small delay
  setTimeout(() => {
    console.log('[Engine] Running initial sweep of active monitors...');
    runMonitoringCycle();
  }, 5000);
};

module.exports = {
  startMonitoringEngine,
  checkEndpoint
};
