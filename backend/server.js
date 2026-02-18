/**
 * Screen Pop Testing - Backend Server
 *
 * Start with:
 *   npm install express dotenv
 *   PORT=3000 node server.js
 *
 * Or on Render/Railway:
 *   PORT=3000 node backend/server.js
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createCrmRoutes } = require('./services/mock-crm-api');
const security = require('./services/screenpop-security');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(express.json());
app.use(express.static('public'));

// Security middleware
app.use(security.setSecurityHeaders);
app.use(security.validateCors);
app.use(security.logRequest);

// ============================================================================
// HEALTH CHECK (no auth required)
// ============================================================================

app.get('/health', (req, res) => {
  security.auditLog({
    action: 'HEALTH_CHECK',
    ip: req.ip
  });

  res.json({
    status: 'ok',
    service: 'Screen Pop Testing API',
    feature: security.FEATURE_FLAG ? 'enabled' : 'disabled',
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// ROUTES
// ============================================================================

// CRM API routes (with security)
createCrmRoutes(app);

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((req, res) => {
  security.auditLog({
    action: 'NOT_FOUND',
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

app.use(security.errorHandler);

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`\n✅ Screen Pop API running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Feature: ${security.FEATURE_FLAG ? 'ENABLED ✅' : 'DISABLED ⚠️'}`);
  console.log(`🌐 Allowed origins: ${security.ALLOWED_ORIGINS.join(', ')}`);
  console.log('\n📖 API Endpoints:\n');
  console.log(`  GET /health - Health check`);
  console.log(`  GET /api/screenpop/customer?phone=+1(209)816-5965 - Lookup customer`);
  console.log(`  GET /api/screenpop/test-data - Get all test customers`);
  console.log(`\n🔑 To generate test tokens:`);
  console.log(`  node -e "require('./services/token-manager').printTokens()"\n`);
});
