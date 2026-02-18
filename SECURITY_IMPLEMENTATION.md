# Security Implementation Guide

**Make the Screen Pop testing framework production-secure**

---

## 🔐 Security Layers

```
┌─────────────────────────────────────────────────────┐
│ LAYER 1: FRONTEND SECURITY (Netlify)               │
├─────────────────────────────────────────────────────┤
│ • HTTPS only (automatic on Netlify)                 │
│ • Auth token required                               │
│ • No sensitive data in localStorage                 │
│ • CORS headers validated                            │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│ LAYER 2: NETWORK SECURITY                           │
├─────────────────────────────────────────────────────┤
│ • HTTPS only for all connections                    │
│ • SSL/TLS certificate validation                    │
│ • Network isolation (VPN/private network)           │
│ • Firewall rules                                    │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│ LAYER 3: API SECURITY (Your Backend)               │
├─────────────────────────────────────────────────────┤
│ • JWT authentication required                       │
│ • Rate limiting (100 req/hour)                      │
│ • Request validation                                │
│ • CORS whitelist                                    │
│ • API key rotation                                  │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│ LAYER 4: DATA SECURITY                             │
├─────────────────────────────────────────────────────┤
│ • Encrypted in transit                              │
│ • Mock data only (no real customer data)            │
│ • Data validation & sanitization                    │
│ • Query parameter escaping                          │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│ LAYER 5: AUDIT & MONITORING                        │
├─────────────────────────────────────────────────────┤
│ • All requests logged                               │
│ • Failed auth attempts tracked                      │
│ • Rate limit violations logged                      │
│ • Anomalies alerted                                 │
└─────────────────────────────────────────────────────┘
```

---

## ✅ Step 1: Update Backend with Security

### **File: `backend/services/screenpop-security.js`** (NEW)

```javascript
/**
 * Screen Pop Security Module
 * Provides authentication, authorization, rate limiting, and audit logging
 */

const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

// ============================================================================
// 1. ENVIRONMENT VARIABLES (set in .env)
// ============================================================================

const JWT_SECRET = process.env.SCREENPOP_JWT_SECRET || 'your-secret-key-change-this';
const ALLOWED_ORIGINS = (process.env.SCREENPOP_ALLOWED_ORIGINS || 'http://localhost:3001').split(',');
const RATE_LIMIT_WINDOW = parseInt(process.env.SCREENPOP_RATE_LIMIT_WINDOW || '3600000'); // 1 hour
const RATE_LIMIT_MAX = parseInt(process.env.SCREENPOP_RATE_LIMIT_MAX || '100');
const AUDIT_LOG_FILE = process.env.SCREENPOP_AUDIT_LOG || '/var/log/screenpop-audit.log';
const FEATURE_FLAG = process.env.SCREENPOP_ENABLED === 'true';

// ============================================================================
// 2. JWT TOKEN GENERATION & VALIDATION
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
// 3. RATE LIMITING (100 requests per hour per user)
// ============================================================================

const screenpopLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW, // 1 hour
  max: RATE_LIMIT_MAX, // 100 requests
  message: 'Too many CRM lookups from this account, please try again later.',
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  skip: (req) => req.user?.role === 'admin', // Admins not rate limited
  keyGenerator: (req) => req.user?.id || req.ip, // Rate limit per user ID or IP
  handler: (req, res) => {
    auditLog({
      action: 'RATE_LIMIT_EXCEEDED',
      user: req.user?.email || 'unknown',
      ip: req.ip,
      reason: 'Exceeded 100 requests/hour'
    });
    res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// ============================================================================
// 4. AUDIT LOGGING
// ============================================================================

function auditLog(entry) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...entry
  };

  console.log(`[SCREENPOP AUDIT] ${JSON.stringify(logEntry)}`);

  // Optionally write to file
  if (AUDIT_LOG_FILE) {
    const fs = require('fs');
    fs.appendFileSync(AUDIT_LOG_FILE, JSON.stringify(logEntry) + '\n', {
      flag: 'a',
      encoding: 'utf8'
    });
  }

  return logEntry;
}

// ============================================================================
// 5. AUTHENTICATION MIDDLEWARE
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
      ip: req.ip,
      path: req.path
    });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = user;
  next();
}

// ============================================================================
// 6. AUTHORIZATION MIDDLEWARE
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
        role: req.user.role,
        requiredRoles: roles,
        path: req.path
      });
      return res.status(403).json({
        error: `Access denied. Required roles: ${roles.join(', ')}`
      });
    }

    next();
  };
}

// ============================================================================
// 7. FEATURE FLAG CHECK
// ============================================================================

function requireFeatureFlag(req, res, next) {
  if (!FEATURE_FLAG) {
    auditLog({
      action: 'FEATURE_DISABLED',
      user: req.user?.email || 'unknown',
      ip: req.ip,
      path: req.path
    });
    return res.status(403).json({
      error: 'Screen Pop testing feature is not enabled'
    });
  }
  next();
}

// ============================================================================
// 8. CORS VALIDATION
// ============================================================================

function validateCors(req, res, next) {
  const origin = req.headers.origin;

  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    auditLog({
      action: 'CORS_REJECTED',
      origin,
      ip: req.ip,
      path: req.path
    });
    return res.status(403).json({ error: 'CORS not allowed' });
  }

  // Set CORS headers
  res.header('Access-Control-Allow-Origin', origin || ALLOWED_ORIGINS[0]);
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Max-Age', '3600');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
}

// ============================================================================
// 9. INPUT VALIDATION & SANITIZATION
// ============================================================================

function sanitizePhone(phone) {
  // Remove all non-digit characters, keep only numbers
  return phone.replace(/\D/g, '');
}

function sanitizeEmail(email) {
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? email.toLowerCase() : null;
}

function validateQueryParams(req, res, next) {
  const { phone, email, customerId } = req.query;

  // At least one param required
  if (!phone && !email && !customerId) {
    return res.status(400).json({
      error: 'Must provide one of: phone, email, or customerId'
    });
  }

  // Validate phone
  if (phone && phone.length > 20) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  // Validate email
  if (email && !sanitizeEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  // Validate customerId
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
// 10. SECURITY HEADERS
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
// 11. REQUEST LOGGING
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
      duration: `${duration}ms`,
      ip: req.ip
    });
  });

  next();
}

// ============================================================================
// 12. ERROR HANDLER
// ============================================================================

function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  auditLog({
    action: 'ERROR',
    error: err.message,
    stack: err.stack,
    user: req.user?.email || 'unknown',
    ip: req.ip,
    path: req.path
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
  sanitizePhone,
  sanitizeEmail,
  validateQueryParams,
  setSecurityHeaders,
  logRequest,
  errorHandler,
  ALLOWED_ORIGINS,
  FEATURE_FLAG
};
```

---

## ✅ Step 2: Update Mock CRM API with Security

### **File: `backend/services/mock-crm-api.js`** (UPDATED)

Replace the route setup section with:

```javascript
/**
 * SECURITY STACK:
 * 1. setSecurityHeaders - Add security headers
 * 2. validateCors - Validate origin
 * 3. logRequest - Log all requests
 * 4. requireFeatureFlag - Check if feature enabled
 * 5. requireAuth - Verify JWT token
 * 6. requireRole - Check user role (admin/qa)
 * 7. screenpopLimiter - Rate limit per user
 * 8. validateQueryParams - Sanitize input
 */

export function createCrmRoutes(app) {
  const security = require('./screenpop-security');

  // Apply security middleware globally
  app.use(security.setSecurityHeaders);
  app.use(security.validateCors);
  app.use(security.logRequest);

  // CRM endpoints with full security stack
  const middleware = [
    security.requireFeatureFlag,
    security.requireAuth,
    security.requireRole(['admin', 'qa']),
    security.screenpopLimiter,
    security.validateQueryParams
  ];

  app.get('/api/screenpop/customer', middleware, (req, res, next) => {
    try {
      const customer = searchCustomer(
        req.validated.phone,
        req.validated.email,
        req.validated.customerId
      );

      if (!customer) {
        security.auditLog({
          action: 'CRM_LOOKUP_NOT_FOUND',
          user: req.user.email,
          query: req.validated
        });
        return res.status(404).json({
          error: 'Customer not found',
          query: req.validated
        });
      }

      security.auditLog({
        action: 'CRM_LOOKUP_SUCCESS',
        user: req.user.email,
        customerId: customer.customerId,
        matchedBy: req.validated.phone ? 'phone' :
                   req.validated.email ? 'email' : 'customerId'
      });

      res.json({
        success: true,
        customer,
        matchedBy: req.validated.phone ? 'phone' :
                   req.validated.email ? 'email' : 'customerId',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  });

  app.get('/api/screenpop/test-data', middleware, (req, res, next) => {
    try {
      security.auditLog({
        action: 'TEST_DATA_ACCESSED',
        user: req.user.email
      });

      res.json({
        customers: mockCustomers,
        count: mockCustomers.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  });

  // Health check (no auth required, but logged)
  app.get('/api/screenpop/health', (req, res) => {
    security.auditLog({
      action: 'HEALTH_CHECK',
      ip: req.ip
    });

    res.json({
      status: 'ok',
      feature: security.FEATURE_FLAG ? 'enabled' : 'disabled',
      timestamp: new Date().toISOString()
    });
  });

  // Error handler
  app.use(security.errorHandler);
}
```

---

## ✅ Step 3: Environment Variables

### **File: `.env.production`** (NEW)

```bash
# SECURITY
NODE_ENV=production
SCREENPOP_ENABLED=true
SCREENPOP_JWT_SECRET=your-super-secret-key-change-this-in-production
SCREENPOP_ALLOWED_ORIGINS=https://screenpop-testing.netlify.app,https://yourcompany.com
SCREENPOP_RATE_LIMIT_WINDOW=3600000
SCREENPOP_RATE_LIMIT_MAX=100
SCREENPOP_AUDIT_LOG=/var/log/screenpop-audit.log

# DATABASE (if using real CRM later)
DATABASE_URL=postgresql://user:password@localhost:5432/screenpop_test
DB_USER=screenpop_user
DB_PASSWORD=secure-password

# LOGGING
LOG_LEVEL=info
LOG_FORMAT=json
```

### **File: `.env.local`** (For local testing)

```bash
NODE_ENV=development
SCREENPOP_ENABLED=true
SCREENPOP_JWT_SECRET=dev-secret-key-not-secure
SCREENPOP_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5173
SCREENPOP_RATE_LIMIT_WINDOW=3600000
SCREENPOP_RATE_LIMIT_MAX=1000
SCREENPOP_AUDIT_LOG=./logs/screenpop-audit.log
```

---

## ✅ Step 4: Secure Frontend Dashboard

### **Update: `frontend/dashboards/with-crm.html`**

Replace the fetch calls:

```javascript
// SECURE VERSION
async function lookupCustomer() {
  const query = document.getElementById('crmQuery').value.trim();
  if (!query) {
    showToast('❌ Enter phone, email, or customer ID');
    return;
  }

  const resultDiv = document.getElementById('crmResult');
  resultDiv.innerHTML = `<div class="crm-result loading"><span class="loader"></span>Looking up...</div>`;

  try {
    // Get auth token from localStorage
    const authToken = localStorage.getItem('screenpop_auth_token');
    if (!authToken) {
      throw new Error('Authentication token required. Please log in.');
    }

    // Determine query type
    let params = {};
    if (query.includes('@')) {
      params.email = query;
    } else if (query.startsWith('CUST')) {
      params.customerId = query;
    } else {
      params.phone = query;
    }

    const queryString = new URLSearchParams(params).toString();

    // SECURE FETCH with auth header
    const response = await fetch(
      `${API_BASE}/api/screenpop/customer?${queryString}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'X-Request-ID': generateRequestId() // Unique request ID for tracking
        },
        credentials: 'include' // Include cookies if using cookie auth
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      } else if (response.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      } else if (response.status === 404) {
        throw new Error('Customer not found');
      }
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    crmData = data.customer;

    // Display securely (sanitize HTML)
    const customer = data.customer;
    const sanitizedName = escapeHtml(`${customer.firstName} ${customer.lastName}`);

    resultDiv.innerHTML = `
      <div class="crm-result">
        <div class="customer-name">${sanitizedName}</div>
        <div class="customer-id">${escapeHtml(customer.customerId)}</div>
        <div class="data-grid">
          <div class="data-item">
            <div class="data-label">Phone</div>
            <div class="data-value">${escapeHtml(customer.phone)}</div>
          </div>
          <!-- ... more fields ... -->
        </div>
      </div>
    `;

    displayParameters();
    showToast(`✓ Loaded ${sanitizedName}`);

  } catch (error) {
    resultDiv.innerHTML = `
      <div class="crm-result error">
        <strong>❌ Error:</strong> ${escapeHtml(error.message)}
      </div>
    `;
    showToast('❌ Lookup failed');
  }
}

// Helper function to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Helper function to generate unique request ID
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

---

## ✅ Step 5: Generate and Manage JWT Tokens

### **File: `backend/services/token-manager.js`** (NEW)

```javascript
/**
 * JWT Token Manager
 * Generate tokens for testing and production use
 */

const { generateToken } = require('./screenpop-security');

// Test users (for development/testing only)
const testUsers = {
  admin: {
    id: 'admin-001',
    email: 'admin@company.com',
    role: 'admin'
  },
  qa: {
    id: 'qa-001',
    email: 'qa@company.com',
    role: 'qa'
  },
  tester: {
    id: 'tester-001',
    email: 'tester@company.com',
    role: 'qa'
  }
};

// Generate test tokens
function generateTestTokens() {
  const tokens = {};
  Object.entries(testUsers).forEach(([key, user]) => {
    tokens[key] = generateToken(user);
  });
  return tokens;
}

module.exports = {
  testUsers,
  generateTestTokens
};
```

---

## ✅ Step 6: Secure Deployment Checklist

### **Pre-Deployment Security Verification**

- [ ] **Environment Variables**
  - [ ] `SCREENPOP_JWT_SECRET` is long (32+ characters) and random
  - [ ] `SCREENPOP_ALLOWED_ORIGINS` whitelist includes only your Netlify URL
  - [ ] `NODE_ENV=production`
  - [ ] `SCREENPOP_ENABLED=false` by default (enable only for testing)

- [ ] **Authentication**
  - [ ] JWT tokens required for all endpoints
  - [ ] Token expiration: 24 hours
  - [ ] Test tokens work locally
  - [ ] Production tokens rotated regularly

- [ ] **Authorization**
  - [ ] Only admin/qa roles can access
  - [ ] Role validation middleware in place
  - [ ] Failed auth attempts logged

- [ ] **Rate Limiting**
  - [ ] 100 requests/hour per user
  - [ ] Admins exempt from rate limiting
  - [ ] Rate limit headers returned
  - [ ] Violations logged and alerted

- [ ] **Input Validation**
  - [ ] Phone numbers sanitized
  - [ ] Emails validated
  - [ ] Customer IDs length-checked
  - [ ] HTML escaped in responses

- [ ] **Data Security**
  - [ ] HTTPS only (no HTTP)
  - [ ] CORS whitelist configured
  - [ ] Security headers set
  - [ ] No sensitive data in logs

- [ ] **Audit Logging**
  - [ ] All requests logged
  - [ ] Failed auth tracked
  - [ ] Rate limit violations logged
  - [ ] Log retention policy defined
  - [ ] Log file permissions: 600 (read-only to app user)

- [ ] **Monitoring**
  - [ ] Error alerts configured
  - [ ] Rate limit alert threshold set
  - [ ] Failed auth alert set
  - [ ] Log aggregation enabled

- [ ] **Network Security**
  - [ ] Firewall rules: only app server can access backend
  - [ ] VPN/private network for agents
  - [ ] DDoS protection enabled
  - [ ] SSL/TLS certificates valid

---

## ✅ Step 7: Testing the Security

### **Local Testing**

```bash
# 1. Start backend
PORT=3001 npm run dev

# 2. Generate test tokens
node -e "const tm = require('./services/token-manager'); console.log(JSON.stringify(tm.generateTestTokens(), null, 2))"

# 3. Test with invalid token (should fail)
curl http://localhost:3001/api/screenpop/test-data
# Returns: 401 Unauthorized

# 4. Test with valid token (should work)
TOKEN=$(node -e "const tm = require('./services/token-manager'); console.log(tm.generateTestTokens().qa)")
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/screenpop/test-data
# Returns: { customers: [...], count: 4, timestamp: "..." }

# 5. Test rate limiting (should block after 100 requests)
for i in {1..150}; do
  curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/screenpop/test-data &
done
# Should show: 429 Too Many Requests

# 6. Test invalid input (should fail)
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3001/api/screenpop/customer?phone=invalid"
# Should sanitize and return no match
```

---

## ✅ Step 8: Production Deployment with Security

### **On Your Server**

```bash
# 1. Set secure environment variables
export SCREENPOP_JWT_SECRET="$(openssl rand -base64 32)"
export SCREENPOP_ALLOWED_ORIGINS="https://screenpop-testing.netlify.app,https://yourcompany.com"
export NODE_ENV="production"
export SCREENPOP_ENABLED="false"  # Only enable for testing

# 2. Create log directory with secure permissions
sudo mkdir -p /var/log/screenpop
sudo chown app-user:app-user /var/log/screenpop
sudo chmod 700 /var/log/screenpop

# 3. Set environment in systemd service
sudo nano /etc/systemd/system/screenpop.service

[Service]
Environment="SCREENPOP_JWT_SECRET=your-secret"
Environment="SCREENPOP_ALLOWED_ORIGINS=https://..."
Environment="NODE_ENV=production"
EnvironmentFile=/opt/screenpop/.env.production

# 4. Restart with new security config
sudo systemctl restart screenpop

# 5. Verify security
curl https://your-backend.com/api/screenpop/health
# Should require auth token
```

---

## 🎯 Summary

Your security implementation includes:

✅ **Authentication**: JWT tokens (24-hour expiry)
✅ **Authorization**: Admin/QA role-based access
✅ **Rate Limiting**: 100 requests/hour per user
✅ **Audit Logging**: Every action logged with timestamp
✅ **Input Validation**: Phone, email, customer ID sanitized
✅ **Security Headers**: CSP, HSTS, X-Frame-Options
✅ **CORS**: Whitelist only your Netlify domain
✅ **HTTPS Only**: No HTTP allowed
✅ **Error Handling**: Secure error messages
✅ **Monitoring**: Alerts for rate limits, failed auth, errors

---

## 📖 Next: Implementation

Ready to implement? Let me:
1. Update your GitHub repo with security code ✅
2. Generate test JWT tokens ✅
3. Configure your Netlify dashboard with auth ✅
4. Set up environment variables ✅
5. Test end-to-end security ✅
