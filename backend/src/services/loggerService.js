const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '..', '..', 'logs');

// Create logs directory if it doesn't exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFilePath = path.join(logDir, 'server.log');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

const writeLog = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const logObj = {
    timestamp,
    level,
    message,
    ...meta
  };

  const logString = JSON.stringify(logObj);

  // Always write to log file
  logStream.write(logString + '\n');

  // In non-production, write pretty output to console
  if (process.env.NODE_ENV !== 'production') {
    const color = level === 'ERROR' ? '\x1b[31m' : level === 'WARN' ? '\x1b[33m' : '\x1b[32m';
    const reset = '\x1b[0m';
    console.log(`[${timestamp}] ${color}${level}${reset}: ${message}`, Object.keys(meta).length ? meta : '');
  } else {
    // Production console structured logs
    console.log(logString);
  }
};

exports.info = (message, meta) => writeLog('INFO', message, meta);
exports.warn = (message, meta) => writeLog('WARN', message, meta);
exports.error = (message, meta) => writeLog('ERROR', message, meta);
