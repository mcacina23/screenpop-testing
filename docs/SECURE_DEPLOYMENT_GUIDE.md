# Secure Screen Pop Testing Deployment Guide

## 🛡️ Security Principles First

**DO NOT** deploy to production without:
- ✅ Test in staging environment ONLY
- ✅ Mock data only (no real customer data)
- ✅ Feature flag to enable/disable
- ✅ Authentication required
- ✅ Rate limiting on CRM queries
- ✅ Audit logging of all lookups
- ✅ HTTPS only (no HTTP)
- ✅ Permission checks (admin/QA only)

---

## 🏗️ Architecture: Isolated Test Environment

```
┌─────────────────────────────────────────────────────┐
│           PRODUCTION (Untouched)                     │
│  - Real agents, real data, real screen pops         │
│  - No changes, no risks                             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│         STAGING (Your Testing Ground)               │
│  - Test agents, mock data only                      │
│  - Screen pop dashboard testing                     │
│  - Feature flags enabled                            │
│  - Isolated database                                │
│  - Rate limited, logged, authenticated              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│            LOCAL DEV (Safe Initial Testing)         │
│  - Your local machine                               │
│  - No network exposure                              │
│  - Unlimited testing                                │
└─────────────────────────────────────────────────────┘
```

---

## ✅ Phase 1: Secure Local Testing (Risk: NONE)

### **1.1 Set Up Locally First**

```bash
# Create isolated test directory
mkdir ~/screenpop-test
cd ~/screenpop-test

# Copy your backend
cp -r ~/Documents/Claude/backlog_analysis_enhanced .

# Create .env for test config
cat > .env.test << 'EOF'
NODE_ENV=test
PORT=3002
SCREENPOP_ENABLED=true
SCREENPOP_USE_MOCK_DATA=true
SCREENPOP_FEATURE_FLAG=test
SCREENPOP_LOG_LOOKUPS=true
EOF

# Start backend on different port (not 3001)
PORT=3002 npm run dev
```

### **1.2 Verify No Production Data**

```bash
# Check mock database ONLY
curl http://localhost:3002/api/screenpop/test-data

# Should return ONLY mock customers:
# - John Doe (test)
# - Sarah Smith (test)
# - Michael Johnson (test)
# - Emily Brown (test)

# MUST NOT connect to real production database
```

### **1.3 Test Dashboard Locally**

```bash
# Open with test data
open "file:///Users/mcacina/Documents/Claude/backlog_analysis_enhanced/screenpop-debug-dashboard-with-crm.html?phone=%2B1(209)%20816-5965"

# Test searches work
# Test CRM lookups return mock data ONLY
# Verify no real customer data appears
```

**Risk Assessment: ✅ ZERO RISK**
- Local only, no network
- Mock data only
- No production access

---

## 🏢 Phase 2: Staging Environment (Risk: LOW)

### **2.1 Deploy to Staging Backend**

**Option A: Separate Staging Server** (Recommended)

```bash
# On staging server
cd /opt/staging/backend

# Create feature flag file
cat > config/features.json << 'EOF'
{
  "screenpop_test_enabled": true,
  "screenpop_test_api_only": true,
  "screenpop_mock_data_only": true,
  "screenpop_require_auth": true,
  "screenpop_require_admin": true,
  "screenpop_allowed_users": ["admin@company.com", "qa@company.com"],
  "screenpop_rate_limit": "100/hour",
  "screenpop_log_all_queries": true
}
EOF

# Add middleware to app.js (BEFORE production routes)
```

**Option B: Separate Port on Same Server** (Faster)

```bash
# Start staging backend on different port
PORT=3002 npm run dev

# Configure firewall to ONLY allow internal access
sudo ufw allow from 10.0.0.0/8 to any port 3002
# ^ Only allow internal network

# BLOCK external access
sudo ufw deny 3002
```

### **2.2 Add Security Middleware**

Update `mock-crm-api.js`:

```javascript
// ADD THIS AT TOP
const rateLimit = require('express-rate-limit');
const auth = require('./middleware/auth');

// Add authentication middleware
const screenpopLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 requests per hour
  message: 'Too many CRM lookups, please try again later.',
  skip: (req) => req.user?.role === 'admin' // Admins unlimited
});

const requireTestMode = (req, res, next) => {
  if (process.env.SCREENPOP_FEATURE_FLAG !== 'test') {
    return res.status(403).json({ error: 'Feature not enabled' });
  }
  next();
};

const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  // Verify token
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// APPLY MIDDLEWARE TO TEST ROUTES
export function createCrmRoutes(app) {
  // Security stack: test mode → auth → admin → rate limit
  const middleware = [
    requireTestMode,
    requireAuth,
    requireAdmin,
    screenpopLimiter
  ];

  app.get('/api/screenpop/customer', middleware, (req, res) => {
    // ... existing code ...

    // ADD AUDIT LOG
    console.log(`[SCREENPOP] User: ${req.user.email}, Query: ${JSON.stringify(req.query)}, Time: ${new Date()}`);

    // ... rest of code ...
  });

  app.get('/api/screenpop/test-data', middleware, (req, res) => {
    // ... existing code ...
  });
}
```

### **2.3 Update Dashboard for Staging**

Create `screenpop-debug-dashboard-staging.html`:

```html
<!-- Add at top of HTML -->
<script>
  // Get auth token from staging
  const AUTH_TOKEN = localStorage.getItem('screenpop_test_token');
  const API_BASE = 'http://staging-internal:3002';

  // Verify we're on staging
  if (!window.location.href.includes('staging')) {
    console.warn('⚠️ Not on staging URL - some features may not work');
  }
</script>

<!-- Update fetch calls -->
<script>
  async function lookupCustomer() {
    const query = document.getElementById('crmQuery').value.trim();
    const resultDiv = document.getElementById('crmResult');

    // ... existing code ...

    try {
      const response = await fetch(`${API_BASE}/api/screenpop/customer?${queryString}`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'X-Request-ID': generateRequestId() // Track requests
        }
      });

      // ... rest of code ...
    }
  }
</script>
```

### **2.4 Verify Staging Setup**

```bash
# Check feature flag is ON
curl -H "Authorization: Bearer $TEST_TOKEN" \
  http://staging-internal:3002/api/screenpop/test-data

# Check rate limiting works
for i in {1..150}; do
  curl -H "Authorization: Bearer $TEST_TOKEN" \
    http://staging-internal:3002/api/screenpop/test-data &
done
# Should block after 100 requests

# Check audit logs
tail -f /var/log/backend/screenpop-audit.log
# Should show: [SCREENPOP] User: qa@company.com, Query: {...}
```

**Risk Assessment: ✅ LOW RISK**
- ✅ Staging environment isolated
- ✅ Mock data only
- ✅ Authentication required
- ✅ Admin access only
- ✅ Rate limited
- ✅ Fully logged
- ✅ No production data access
- ✅ Feature flag can disable instantly

---

## 🎯 Phase 3: Agent Workspace Testing (Risk: MEDIUM - MITIGATED)

### **3.1 Create Test Agent Accounts**

```bash
# In 8x8 CM interface
# Create 3 test agents (DO NOT use real agents):
- agent-test-1@company.com (queue: test-queue)
- agent-test-2@company.com (queue: test-queue)
- agent-test-3@company.com (queue: test-queue)

# Assign to dedicated "TEST" queue (isolated from production)
# Do NOT assign to customer-facing queues
```

### **3.2 Configure Screen Pop for Test Queue ONLY**

```bash
# In 8x8 CM: Integration → Screen Pop

# Configuration:
- Enable: YES
- Target Type: Custom
- Target URL: https://staging-internal.company.com/screenpop-dashboard
- Trigger: ONLY for test-queue
- Media: phone, email
- Window Size: 800×600

# Security:
- HTTPS only: YES
- Require SSL: YES
- Certificate verification: YES
```

### **3.3 Set Up Isolated Test Queue**

```bash
# In 8x8 CM: Queues

New Queue: "SCREENPOP_TEST"
- Do NOT route actual customer calls
- Manually add test numbers
- Only test agents assigned
- Separate from production queues
```

### **3.4 Configure Test Call Routing**

**Option A: Manual Test Calls**
```bash
# Don't use customer numbers
# Use test numbers you control:
- Test Number 1: +1(209) 816-5965 → Agent Test 1 → Screen Pop opens
- Test Number 2: +1(555) 234-5678 → Agent Test 2 → Screen Pop opens
- Test Number 3: +1(415) 555-0123 → Agent Test 3 → Screen Pop opens

# These map to mock CRM records
```

**Option B: Recorded Call Simulation**
```bash
# Use 8x8 API to simulate calls
POST /api/interactions
{
  "phone": "+1(209)816-5965",
  "agentId": "agent-test-1",
  "queue": "SCREENPOP_TEST",
  "simulateScreenPop": true
}
# Triggers screen pop without real customer impact
```

### **3.5 Monitor Test Queue**

```bash
# Real-time monitoring dashboard
# Watch for:
- ✅ Screen pop opens correctly
- ✅ CRM data loads from mock database
- ✅ Parameters display correctly
- ✅ No errors in console
- ✅ No production data visible
- ✅ Test queue isolated from customer traffic
```

**Risk Assessment: ✅ MEDIUM - CONTROLLED**
- ✅ Test queue isolated
- ✅ Test agents only
- ✅ Test numbers only
- ✅ Mock data only
- ✅ No customer impact possible
- ✅ Can disable screen pop in 2 seconds
- ⚠️ Staging environment must be reliable

---

## 🔐 Security Checklist

### **Before Deploying to Staging:**

- [ ] Feature flag OFF by default
- [ ] Mock data confirmed (no real customers)
- [ ] Authentication middleware added
- [ ] Authorization checks (admin only)
- [ ] Rate limiting configured (100/hour)
- [ ] Audit logging enabled
- [ ] HTTPS certificate valid
- [ ] Firewall rules restrict access
- [ ] Database connection string points to TEST db only
- [ ] Environment variables use test values

### **Before Agent Testing:**

- [ ] Test agents created (not real agents)
- [ ] Test queue created (not production)
- [ ] Test numbers configured (controlled)
- [ ] Screen pop URL uses staging URL
- [ ] 8x8 feature flag enabled for test queue only
- [ ] Monitoring enabled
- [ ] Rollback plan documented
- [ ] Team notified (no surprise testing)

### **During Testing:**

- [ ] Monitor for errors
- [ ] Watch for data leaks
- [ ] Check rate limiting works
- [ ] Verify audit logs record lookups
- [ ] No production agents affected
- [ ] No customer traffic routed to test queue

### **After Testing:**

- [ ] Feature flag OFF
- [ ] Test agents deleted
- [ ] Test queue cleared
- [ ] Review audit logs for issues
- [ ] Document findings
- [ ] Plan next phase

---

## 🚨 Rollback Plan (If Issues)

### **Immediate Disable (30 seconds):**

```bash
# Option 1: Feature flag off
echo '{"screenpop_test_enabled": false}' > config/features.json
systemctl restart backend

# Option 2: Unplug test queue from screen pop
# In 8x8 CM: Disable screen pop for test queue

# Option 3: Block at network level
sudo ufw deny 3002
```

### **Full Rollback (Production Untouched):**

```bash
# Because we never touched production:
# - Production backend: unchanged
# - Production data: unchanged
# - Production agents: never affected
# - Production screen pop: still working normally

# Simply:
1. Feature flag OFF
2. Test environment DOWN
3. Production continues normally
```

---

## 📊 Testing Checklist

### **Phase 1: Local (Your Machine)**
- [ ] Backend starts on port 3002
- [ ] Mock CRM API responds
- [ ] Dashboard opens locally
- [ ] Test lookups work
- [ ] Only mock data appears

### **Phase 2: Staging (Isolated Server)**
- [ ] Staging backend running
- [ ] Feature flag enabled for staging
- [ ] Authentication works
- [ ] Rate limiting tested
- [ ] Audit logs recording

### **Phase 3: Agent Testing (Test Workspace)**
- [ ] Test agents created
- [ ] Test queue isolated
- [ ] Screen pop opens in test queue
- [ ] CRM data displays
- [ ] No production agents affected
- [ ] Monitoring active

---

## 🎯 Success Criteria

You're ready to move forward when:

✅ **Local Testing Complete:**
- Mock data returns correctly
- Dashboard displays all parameters
- No errors in console

✅ **Staging Tested:**
- Feature flag enables/disables cleanly
- Authentication required
- Rate limiting works
- Audit logs record everything
- Firewall blocks unauthorized access

✅ **Agent Workspace Verified:**
- Test agents can trigger screen pop
- CRM data populates
- Parameters show [real] and [inferred]
- No production agents impacted
- Can disable in under 1 minute

✅ **Security Confirmed:**
- No real customer data anywhere
- Production completely untouched
- Full audit trail exists
- Instant rollback available

---

## 📈 Next Steps After Testing

1. **If Successful:**
   - Document learnings
   - Plan integration with real CRM
   - Build permanent implementation
   - Schedule production deployment

2. **If Issues Found:**
   - Fix in mock API
   - Retest in staging
   - Update documentation
   - Retry agent testing

3. **For Production (Later):**
   - Migrate from mock to real CRM
   - Add real-time data instead of test data
   - Implement real authentication
   - Go through full security audit
   - Gradual rollout to production queues

---

## 🛠️ Commands Reference

```bash
# Start local test
PORT=3002 npm run dev

# Deploy to staging
git push staging main
ssh staging-server 'cd /opt/staging/backend && npm run deploy'

# Enable feature flag
ssh staging-server 'echo "{\"screenpop_test_enabled\": true}" > config/features.json && systemctl restart backend'

# Disable feature flag (EMERGENCY)
ssh staging-server 'echo "{\"screenpop_test_enabled\": false}" > config/features.json && systemctl restart backend'

# Watch logs
ssh staging-server 'tail -f /var/log/backend/screenpop-audit.log'

# Check test data
curl -H "Authorization: Bearer $TOKEN" http://staging-internal:3002/api/screenpop/test-data

# Block network (last resort)
ssh staging-server 'sudo ufw deny 3002'
```

---

## ❓ FAQ

**Q: Will this affect production agents?**
A: ✅ Zero impact. Completely isolated test environment.

**Q: What if there's a bug?**
A: ✅ Disable feature flag (1 command) - production untouched.

**Q: Can real customer data leak?**
A: ✅ No. Only mock data in test database.

**Q: How do I know it's working?**
A: ✅ Audit logs show every lookup, test numbers return test data.

**Q: When can we go to production?**
A: After successful staging tests + security review + real CRM integration.

**Q: What about performance?**
A: ✅ Rate limited to 100/hour in staging, won't impact production.

**Q: Can agents see test data by accident?**
A: ✅ No. Test agents only, test queue only, feature flag prevents it.
