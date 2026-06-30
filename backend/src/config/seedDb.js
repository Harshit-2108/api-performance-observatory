const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Monitor = require('../models/Monitor');
const Metric = require('../models/Metric');
const Incident = require('../models/Incident');
const DeploymentEvent = require('../models/DeploymentEvent');
const logger = require('../services/loggerService');

/**
 * Seeds default database records into MongoDB if the collections are empty.
 */
const seedDatabase = async () => {
  try {
    // 1. Check if database is already populated
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      logger.info('Database already seeded. Skipping initial seeding.');
      return;
    }

    logger.info('Empty database detected. Starting initial data seeding...');

    // 2. Seed Admin User
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    const admin = await User.create({
      name: 'Observatory Admin',
      email: 'admin@observatory.local',
      password: hashedPassword,
      role: 'admin',
      notificationPreferences: {
        emailEnabled: true,
        slowThreshold: 1500
      }
    });

    const adminId = admin._id;
    logger.info('Default Admin user created successfully.');

    // 3. Seed Monitors
    const stripeMonitor = await Monitor.create({
      name: 'Stripe Billing Gateway',
      url: 'https://api.stripe.com/v1/health',
      method: 'GET',
      headers: new Map(),
      body: '',
      interval: 5,
      timeout: 5000,
      threshold: 3,
      expectedStatus: 200,
      description: 'Payment collection API endpoint check.',
      tags: ['production', 'billing', 'core'],
      active: true,
      userId: adminId,
      status: 'UP',
      lastChecked: new Date()
    });

    const authMonitor = await Monitor.create({
      name: 'User Authentication API',
      url: 'https://auth.company.com/oauth/token',
      method: 'POST',
      headers: new Map(),
      body: '',
      interval: 5,
      timeout: 5000,
      threshold: 3,
      expectedStatus: 200,
      description: 'OAuth2 credential verification server check.',
      tags: ['production', 'security', 'auth'],
      active: true,
      userId: adminId,
      status: 'UP',
      lastChecked: new Date()
    });

    const stripeId = stripeMonitor._id;
    const authId = authMonitor._id;
    logger.info('Default Monitor services created successfully.');

    // 4. Seed 24-Hour Metric History (1 check per hour)
    const now = Date.now();
    const metricsData = [];

    for (let i = 24; i >= 0; i--) {
      const timestamp = new Date(now - i * 60 * 60 * 1000);
      
      // Stripe metrics
      let stripeIsUp = true;
      let stripeStatus = 200;
      let stripeLatency = Math.floor(Math.random() * 150) + 200; // 200ms - 350ms
      
      if (i === 12) {
        stripeLatency = 1450;
      }
      if (i === 6) {
        stripeIsUp = false;
        stripeStatus = 503;
        stripeLatency = 420;
      }

      metricsData.push({
        monitorId: stripeId,
        timestamp,
        responseTime: stripeLatency,
        status: stripeStatus,
        isUp: stripeIsUp,
        regionalLatency: {
          us: stripeIsUp ? Math.round(stripeLatency * (0.7 + Math.random() * 0.2)) : 0,
          eu: stripeIsUp ? Math.round(stripeLatency * (1.0 + Math.random() * 0.2)) : 0,
          in: stripeIsUp ? Math.round(stripeLatency * (1.4 + Math.random() * 0.3)) : 0,
          as: stripeIsUp ? Math.round(stripeLatency * (1.2 + Math.random() * 0.2)) : 0
        }
      });

      // Auth metrics
      let authIsUp = true;
      let authStatus = 200;
      let authLatency = Math.floor(Math.random() * 40) + 70; // 70ms - 110ms
      
      if (i === 18) {
        authLatency = 680;
      }

      metricsData.push({
        monitorId: authId,
        timestamp,
        responseTime: authLatency,
        status: authStatus,
        isUp: authIsUp,
        regionalLatency: {
          in: authIsUp ? Math.round(authLatency * (0.8 + Math.random() * 0.15)) : 0,
          as: authIsUp ? Math.round(authLatency * (1.1 + Math.random() * 0.2)) : 0,
          eu: authIsUp ? Math.round(authLatency * (1.5 + Math.random() * 0.3)) : 0,
          us: authIsUp ? Math.round(authLatency * (1.7 + Math.random() * 0.4)) : 0
        }
      });
    }

    await Metric.insertMany(metricsData);
    logger.info('Default Metric history seeded successfully.');

    // 5. Seed Incidents
    await Incident.create([
      {
        monitorId: stripeId,
        status: 'RESOLVED',
        type: 'DOWN',
        message: 'Monitor "Stripe Billing Gateway" failed: Expected status 200, got 503',
        downtimeStart: new Date(now - 6.25 * 60 * 60 * 1000),
        downtimeEnd: new Date(now - 6.0 * 60 * 60 * 1000),
        acknowledged: true,
        acknowledgedAt: new Date(now - 6.16 * 60 * 60 * 1000),
        acknowledgedBy: adminId,
        resolvedBy: adminId,
        resolutionNotes: 'Stripe API recovered automatically after a brief network timeout.',
        rootCause: 'Upstream gateway server congestion.',
        timeline: [
          {
            message: 'Outage detected: Monitor "Stripe Billing Gateway" failed: Expected status 200, got 503',
            timestamp: new Date(now - 6.25 * 60 * 60 * 1000),
            type: 'TRIGGERED'
          },
          {
            message: 'Incident acknowledged by Observatory Admin',
            timestamp: new Date(now - 6.16 * 60 * 60 * 1000),
            type: 'ACKNOWLEDGED'
          },
          {
            message: 'Outage resolved: recovered automatically with status 200',
            timestamp: new Date(now - 6.0 * 60 * 60 * 1000),
            type: 'RESOLVED'
          }
        ]
      },
      {
        monitorId: authId,
        status: 'OPEN',
        type: 'DOWN',
        message: 'Monitor "User Authentication API" failed: Request timeout exceeding 5000ms',
        downtimeStart: new Date(now - 10 * 60 * 1000),
        acknowledged: false,
        timeline: [
          {
            message: 'Outage detected: Monitor "User Authentication API" failed: Request timeout exceeding 5000ms',
            timestamp: new Date(now - 10 * 60 * 1000),
            type: 'TRIGGERED'
          }
        ]
      }
    ]);
    logger.info('Default Incidents logs seeded successfully.');

    // 6. Seed Deployment Events
    await DeploymentEvent.create([
      {
        type: 'DEPLOYMENT',
        title: 'Deploy to Production (v1.0.4)',
        description: 'Merged Pull Request #147: Optimized payment router query checks',
        sha: '4a2d7b1',
        environment: 'production',
        author: 'Jane Doe SRE',
        repository: 'stripe-payment-gateway',
        url: 'https://github.com/observatory/stripe-payment-gateway/commit/4a2d7b1',
        timestamp: new Date(now - 3 * 3600000 - 10 * 60 * 1000)
      },
      {
        type: 'COMMIT',
        title: 'Refactored auth validation cache policies',
        description: 'Added Redis cache middleware to reduce DB check loads.',
        sha: 'cf903b1',
        environment: 'production',
        author: 'John Doe Developer',
        repository: 'user-auth-service',
        url: 'https://github.com/observatory/user-auth-service/commit/cf903b1',
        timestamp: new Date(now - 6 * 3600000)
      },
      {
        type: 'RELEASE',
        title: 'Release v1.2.0-stable',
        description: 'Stable iteration release including general platform optimizations.',
        sha: 'e5a1b3c',
        environment: 'production',
        author: 'observatory-release-bot',
        repository: 'api-performance-observatory',
        url: 'https://github.com/observatory/api-performance-observatory/releases/tag/v1.2.0-stable',
        timestamp: new Date(now - 12 * 3600000)
      }
    ]);

    logger.info('Default Deployment Events seeded successfully. Seeding completed.');
  } catch (error) {
    logger.error(`Database seeding failed: ${error.message}`, { stack: error.stack });
  }
};

module.exports = seedDatabase;
