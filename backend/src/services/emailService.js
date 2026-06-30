const nodemailer = require('nodemailer');

// Setup transporter configuration using env variables
const getTransporter = () => {
  const hasSMTP = 
    process.env.SMTP_HOST && 
    process.env.SMTP_PORT && 
    process.env.SMTP_USER && 
    process.env.SMTP_PASS;

  if (hasSMTP) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return null;
};

// Return stylized colors & symbols for alert emails
const getAlertConfig = (type) => {
  switch (type) {
    case 'OUTAGE':
      return {
        subject: '🔴 ALERT: API Outage Detected',
        title: 'API Outage Alert',
        color: '#ef4444', // Red
        icon: '⚠️'
      };
    case 'RECOVERY':
      return {
        subject: '🟢 RESOLVED: API Operational Status Recovered',
        title: 'API Recovery Notification',
        color: '#10b981', // Green
        icon: '✅'
      };
    case 'SLOW_RESPONSE':
      return {
        subject: '🟡 WARNING: Slow API Latency Detected',
        title: 'API Performance Warning',
        color: '#f59e0b', // Amber
        icon: '⏳'
      };
    default:
      return {
        subject: '🔵 Alert: API Observatory Event',
        title: 'API Observatory Alert',
        color: '#3b82f6',
        icon: 'ℹ️'
      };
  }
};

// Dispatch email alerts
exports.sendAlertEmail = async (user, monitor, type, details) => {
  const userEmail = user.email || 'recipient@observatory.local';
  const userName = user.name || 'User';

  if (user.notificationPreferences && user.notificationPreferences.emailEnabled === false) {
    console.log(`[Email Service] Skip sending mail. Email alerts are disabled in notification preferences for user "${userName}"`);
    return;
  }

  const config = getAlertConfig(type);
  const slowThresholdMs = user.notificationPreferences?.slowThreshold || 1500;

  // Build premium HTML Template
  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #020617; color: #cbd5e1; margin: 0; padding: 40px 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 24px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 20px 40px -15px rgba(0,0,0,0.5); }
          .header { background-color: #1e293b; padding: 30px; text-align: center; border-bottom: 2px solid ${config.color}; }
          .badge { display: inline-block; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: ${config.color}; background-color: rgba(255,255,255,0.03); border: 1px solid ${config.color}33; padding: 6px 12px; border-radius: 8px; margin-bottom: 12px; }
          .title { color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; }
          .body { padding: 40px 30px; line-height: 1.6; }
          .monitor-card { background-color: #020617; border: 1px solid #1e293b; border-radius: 16px; padding: 20px; margin: 25px 0; }
          .monitor-name { font-size: 18px; font-weight: bold; color: #ffffff; margin: 0 0 10px 0; }
          .monitor-detail { font-size: 13px; font-family: monospace; color: #94a3b8; margin: 5px 0; word-break: break-all; }
          .footer { background-color: #020617; padding: 20px 30px; font-size: 11px; text-align: center; color: #64748b; border-top: 1px solid #1e293b; }
          .button { display: inline-block; background-color: #6d28d9; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: bold; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="badge" style="color: ${config.color}; border-color: ${config.color}55">${config.icon} ${type}</span>
            <h1 class="title">${config.title}</h1>
          </div>
          <div class="body">
            <p>Hello <strong>${userName}</strong>,</p>
            <p>Our observatory checks have detected a status transition event on your monitored API endpoint:</p>
            
            <div class="monitor-card">
              <h3 class="monitor-name">${monitor.name}</h3>
              <p class="monitor-detail"><strong>URL:</strong> ${monitor.url}</p>
              <p class="monitor-detail"><strong>Method:</strong> ${monitor.method}</p>
              <p class="monitor-detail"><strong>Details:</strong> ${details}</p>
              ${type === 'SLOW_RESPONSE' ? `<p class="monitor-detail"><strong>Alert Threshold:</strong> ${slowThresholdMs}ms</p>` : ''}
            </div>

            <p>Please check your observatory dashboard console to view latency logs, metrics histories, and resolution updates.</p>
            <div style="text-align: center;">
              <a href="http://localhost:3000/dashboard" class="button" style="color: #ffffff;">Open Observatory Dashboard</a>
            </div>
          </div>
          <div class="footer">
            API Performance Observatory • Dynamic Automated Alert Systems • Local Host
          </div>
        </div>
      </body>
    </html>
  `;

  const transporter = getTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"API Observatory" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `${config.subject} - ${monitor.name}`,
        html: emailHtml
      });
      console.log(`[Email Service] Email sent successfully to ${userEmail} [Type: ${type}]`);
    } catch (err) {
      console.error(`[Email Service] SMTP dispatch error: ${err.message}`);
      simulateEmail(userEmail, type, monitor.name, details, emailHtml);
    }
  } else {
    // If SMTP credentials not defined, run simulated console logging
    simulateEmail(userEmail, type, monitor.name, details, emailHtml);
  }
};

const simulateEmail = (recipient, type, monitorName, details, html) => {
  const config = getAlertConfig(type);
  console.log('------------------------------------------------------------');
  console.log(`[EMAIL SIMULATION] Sent to: ${recipient}`);
  console.log(`[EMAIL SIMULATION] Subject: ${config.subject} - ${monitorName}`);
  console.log(`[EMAIL SIMULATION] Details: ${details}`);
  console.log('------------------------------------------------------------');
};
