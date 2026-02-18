/**
 * Screen Pop Security Module
 * Provides authentication, authorization, rate limiting, and audit logging
 */

const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// ============================================================================
// CONFIGURATION
// ============================================================================

const JWT_SECRET = process.env.SCREENPOP_JWT_SECRET || 'dev-secret-key-change-in-production';
const ALLOWED_ORIGINS = (process.env.SCREENPOP_ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(',');
const RATE_LIMIT_WINDOW = parseInt(process.env.SCREENPOP_RATE_LIMIT_WINDOW || '3600000');
const RATE_LIMIT_MAX = parseInt(process.env.SCREENPOP_RATE_LIMIT_MAX || '100');
const AUDIT_LOG_FILE = process.env.SCREENPOP_AUDIT_LOG || './logs/screenpop-audit.log';
const FEATURE_FLAG = process.env.SCREENPOP_ENABLED === 'true';

// ============================================================================
// JWT TOKEN GENERATION & VALIDATION
// ============================================================================

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    },
    JWT_SECRET
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// ============================================================================
// RATE LIMITING
// ============================================================================

const screenpopLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  max: RATE_LIMIT_MAX,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.user?.role === 'admin',
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    auditLog({
      action: 'RATE_LIMIT_EXCEEDED',
      user: req.user?.email || 'unknown',
      ip: req.ip
    });
    res.status(429).json({ error: 'Rate limit exceeded' });
  }
});

// ============================================================================
// AUDIT LOGGING
// ============================================================================

function auditLog(entry) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...entry
  };

  console.log(`[SCREENPOP] ${JSON.stringify(logEntry)}`);

  // Write to file if configured
  if (AUDIT_LOG_FILE) {
    try {
      const fs = require('fs');
      const path = require('path');
      const dir = path.dirname(AUDIT_LOG_FILE);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.appendFileSync(AUDIT_LOG_FILE, JSON.stringify(logEntry) + '\n');
    } catch (err) {
      console.error('Failed to write audit log:', err.message);
    }
  }

  return logEntry;
}

// ============================================================================
// MIDDLEWARE: AUTHENTICATION
// ============================================================================

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    auditLog({
      action: 'AUTH_FAILED',
      reason: 'Missing authorization header',
      ip: req.ip,
      path: req.path
    });
    return res.status(401).json({ error: 'Authorization header required' });
  }

  const token = authHeader.replace('Bearer ', '');
  const user = verifyToken(token);

  if (!user) {
    auditLog({
      action: 'AUTH_FAILED',
      reason: 'Invalid or expired token',
      ip: req.ip
    });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = user;
  auditLog({
    action: 'AUTH_SUCCESS',
    user: user.email,
    role: user.role
  });
  next();
}

// ============================================================================
// MIDDLEWARE: AUTHORIZATION
// ============================================================================

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      auditLog({
        action: 'AUTHORIZATION_FAILED',
        user: req.user.email,
        requiredRoles: roles
      });
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  };
}

// ============================================================================
// MIDDLEWARE: FEATURE FLAG
// ============================================================================

function requireFeatureFlag(req, res, next) {
  if (!FEATURE_FLAG) {
    auditLog({
      action: 'FEATURE_DISABLED',
      user: req.user?.email || 'unknown'
    });
    return res.status(403).json({ error: 'Screen Pop testing is not enabled' });
  }
  next();
}

// ============================================================================
// MIDDLEWARE: CORS VALIDATION
// ============================================================================

function validateCors(req, res, next) {
  const origin = req.headers.origin;

  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    auditLog({
      action: 'CORS_REJECTED',
      origin,
      ip: req.ip
    });
    return res.status(403).json({ error: 'CORS not allowed' });
  }

  res.header('Access-Control-Allow-Origin', origin || ALLOWED_ORIGINS[0]);
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
}

// ============================================================================
// MIDDLEWARE: INPUT VALIDATION
// ============================================================================

function sanitizePhone(phone) {
  return phone.replace(/\D/g, '');
}

function sanitizeEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? email.toLowerCase() : null;
}

function validateQueryParams(req, res, next) {
  const { phone, email, customerId } = req.query;

  if (!phone && !email && !customerId) {
    return res.status(400).json({
      error: 'Must provide one of: phone, email, or customerId'
    });
  }

  if (phone && phone.length > 20) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  if (email && !sanitizeEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  if (customerId && customerId.length > 50) {
    return res.status(400).json({ error: 'Invalid customer ID' });
  }

  req.validated = {
    phone: phone ? sanitizePhone(phone) : null,
    email: email ? sanitizeEmail(email) : null,
    customerId: customerId
  };

  next();
}

// ============================================================================
// MIDDLEWARE: SECURITY HEADERS
// ============================================================================

function setSecurityHeaders(req, res, next) {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.header('Content-Security-Policy', "default-src 'self'");
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

// ============================================================================
// MIDDLEWARE: REQUEST LOGGING
// ============================================================================

function logRequest(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    auditLog({
      action: 'API_REQUEST',
      method: req.method,
      path: req.path,
      status: res.statusCode,
      user: req.user?.email || 'anonymous',
      duration: `${duration}ms`
    });
  });

  next();
}

// ============================================================================
// ERROR HANDLER
// ============================================================================

function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  auditLog({
    action: 'ERROR',
    error: err.message,
    user: req.user?.email || 'unknown'
  });

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  generateToken,
  verifyToken,
  screenpopLimiter,
  auditLog,
  requireAuth,
  requireRole,
  requireFeatureFlag,
  validateCors,
  validateQueryParams,
  setSecurityHeaders,
  logRequest,
  errorHandler,
  ALLOWED_ORIGINS,
  FEATURE_FLAG
};
