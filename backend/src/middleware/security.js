// Custom Security Headers middleware (alternative to Helmet)
module.exports = (req, res, next) => {
  // Prevent mime-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking / framing
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Enable XSS filtering in browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // HTTP Strict Transport Security (HSTS) - enforce HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Configure Referrer Policy
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  
  // Remove Powered-By header to prevent fingerprinting
  res.removeHeader('X-Powered-By');
  
  next();
};
