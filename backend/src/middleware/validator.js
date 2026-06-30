const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const urlRegex = /^https?:\/\/[^\s$.?#].[^\s]*$/i;

const sendValidationError = (res, errors) => {
  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors
  });
};

exports.validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;
  const errors = {};

  if (!name || !name.trim()) errors.name = 'Name is required';
  if (!email || !emailRegex.test(email)) errors.email = 'A valid email address is required';
  if (!password || password.length < 6) errors.password = 'Password must be at least 6 characters long';

  if (Object.keys(errors).length > 0) {
    return sendValidationError(res, errors);
  }
  next();
};

exports.validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = {};

  if (!email || !emailRegex.test(email)) errors.email = 'A valid email address is required';
  if (!password) errors.password = 'Password is required';

  if (Object.keys(errors).length > 0) {
    return sendValidationError(res, errors);
  }
  next();
};

exports.validateMonitor = (req, res, next) => {
  const { name, url, interval, method, expectedStatus } = req.body;
  const errors = {};

  if (!name || !name.trim()) {
    errors.name = 'Monitor name is required';
  }

  if (!url || !urlRegex.test(url)) {
    errors.url = 'A valid HTTP or HTTPS endpoint URL is required';
  }

  if (interval === undefined || isNaN(interval) || parseInt(interval) < 1 || parseInt(interval) > 1440) {
    errors.interval = 'Interval must be a valid integer between 1 and 1440 minutes';
  }

  const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
  if (!method || !validMethods.includes(method.toUpperCase())) {
    errors.method = `Method must be one of: ${validMethods.join(', ')}`;
  }

  if (expectedStatus !== undefined && (isNaN(expectedStatus) || parseInt(expectedStatus) < 100 || parseInt(expectedStatus) > 599)) {
    errors.expectedStatus = 'Expected status must be a valid HTTP code between 100 and 599';
  }

  if (Object.keys(errors).length > 0) {
    return sendValidationError(res, errors);
  }
  next();
};
