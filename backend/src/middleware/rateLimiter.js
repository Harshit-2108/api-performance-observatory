const rateLimits = new Map();

// Periodically clean up memory Map to prevent leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimits.entries()) {
    if (now > data.resetTime) {
      rateLimits.delete(ip);
    }
  }
}, 5 * 60 * 1000); // every 5 minutes

module.exports = (config = {}) => {
  const windowMs = config.windowMs || 15 * 60 * 1000; // 15 mins default
  const max = config.max || 100; // 100 requests default
  const message = config.message || 'Too many requests from this IP, please try again later.';

  return (req, res, next) => {
    // Under proxy setups (e.g. Render, Vercel), trust x-forwarded-for or fallback to remoteAddress
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();

    let rateData = rateLimits.get(ip);

    if (!rateData) {
      rateData = {
        count: 1,
        resetTime: now + windowMs
      };
      rateLimits.set(ip, rateData);
    } else if (now > rateData.resetTime) {
      // Reset window
      rateData.count = 1;
      rateData.resetTime = now + windowMs;
    } else {
      rateData.count++;
    }

    const remaining = Math.max(0, max - rateData.count);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(rateData.resetTime / 1000));

    if (rateData.count > max) {
      const retryAfterSeconds = Math.ceil((rateData.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        success: false,
        message,
        retryAfter: retryAfterSeconds
      });
    }

    next();
  };
};
