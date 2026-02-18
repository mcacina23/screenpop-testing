# Screen Pop Testing Framework

**Safe, isolated testing environment for 8x8 Screen Pop integrations**

A complete testing framework to validate Screen Pop functionality, CRM data enrichment, and parameter passing without any production risk.

---

## 🎯 Purpose

Screen Pop is an 8x8 feature that automatically opens external web pages (CRM, claims systems, etc.) when an agent receives a call. This project provides:

✅ **Mock CRM Database** - Realistic test data (4 customers pre-loaded)
✅ **Debug Dashboard** - View all parameters passed by 8x8
✅ **CRM Integration Testing** - Query backend for enriched data
✅ **Security Framework** - Feature flags, auth, rate limiting, audit logs
✅ **Deployment Guides** - Local → Staging → Production safe pathway

---

## 📂 Project Structure

```
screenpop-testing/
├── backend/
│   └── services/
│       └── mock-crm-api.js          # Mock CRM with 4 test customers
├── frontend/
│   └── dashboards/
│       ├── basic.html                # Simple parameter viewer
│       └── with-crm.html             # With CRM lookup integration
├── docs/
│   ├── SCREENPOP_SETUP.md            # Integration & setup guide
│   ├── SECURE_DEPLOYMENT_GUIDE.md    # Risk-free deployment steps
│   └── PARAMETER_SOURCE_MATRIX.md    # Real vs Inferred parameters
├── config/
│   ├── features.json                 # Feature flags
│   ├── test-users.json               # Test agent accounts
│   └── test-queues.json              # Test queue config
├── tests/
│   ├── api.test.js                   # API endpoint tests
│   └── data.test.js                  # Data validation tests
└── README.md                         # This file
```

---

## 🚀 Quick Start (5 minutes)

### **1. Local Testing (No Network)**

```bash
# Start backend on test port
PORT=3002 npm run dev

# Test CRM API
curl http://localhost:3002/api/screenpop/test-data

# Open dashboard
open file:///Users/mcacina/Documents/Claude/screenpop-testing/frontend/dashboards/with-crm.html

# Test with John Doe's phone number
# In dashboard: +1(209) 816-5965 → Click Search
```

### **2. Staging Deployment (Isolated)**

```bash
# Deploy to staging server
git push staging main

# Enable feature flag (QA/Admin only)
ssh staging "echo '{\"screenpop_test_enabled\": true}' > config/features.json"

# Test endpoint (requires auth token)
curl -H "Authorization: Bearer $TEST_TOKEN" \
  https://staging.company.com/api/screenpop/customer?phone=%2B1(209)816-5965
```

### **3. Agent Testing (Test Queue Only)**

```bash
# In 8x8 CM:
# 1. Create test queue: "SCREENPOP_TEST"
# 2. Create test agents: agent-test-1@, agent-test-2@
# 3. Configure screen pop → target staging dashboard
# 4. Route test numbers → test queue

# Test: Call test number → Screen pop opens with CRM data
```

---

## 📊 Test Data

### **Pre-loaded Test Customers**

| Name | Phone | Email | Tier | Status |
|------|-------|-------|------|--------|
| John Doe | +1(209) 816-5965 | john.doe@example.com | Gold | Active claim |
| Sarah Smith | +1(555) 234-5678 | sarah.smith@example.com | Silver | Recent interactions |
| Michael Johnson | +1(415) 555-0123 | michael.johnson@example.com | Platinum | High value |
| Emily Brown | +1(310) 555-9876 | emily.brown@example.com | Bronze | New customer |

**To add more customers:** Edit `backend/services/mock-crm-api.js` → `mockCustomers` array

---

## 🔐 Security Features

✅ **Feature Flags** - Enable/disable testing instantly
✅ **Authentication** - JWT tokens required
✅ **Authorization** - Admin/QA access only
✅ **Rate Limiting** - 100 requests/hour per user
✅ **Audit Logging** - Every query logged with timestamp/user
✅ **Isolation** - Separate database, separate port, separate queue
✅ **Firewall Rules** - Internal network only (no external access)
✅ **Mock Data Only** - No real customer data anywhere

---

## 📋 Three-Phase Deployment

### **Phase 1: Local Testing** ✅ (You are here)
- Backend on localhost:3002
- Dashboard opened locally
- Zero network risk
- Full debugging capability

### **Phase 2: Staging** ⚠️ (Next)
- Staging backend server
- Feature flag enabled
- Authentication required
- Rate limited & logged
- Isolated test database

### **Phase 3: Agent Testing** ⚠️ (After Phase 2)
- Test agents in test queue
- Screen pop integrated
- Real 8x8 workspace
- Monitored closely
- Instant rollback available

**→ See [SECURE_DEPLOYMENT_GUIDE.md](docs/SECURE_DEPLOYMENT_GUIDE.md) for detailed steps**

---

## 🧪 Dashboard Features

### **Basic Dashboard** (`basic.html`)
- Shows all 40+ possible parameters
- Displays which are [real] vs [inferred]
- Copy-to-clipboard for all values
- Organized by category

### **Advanced Dashboard** (`with-crm.html`)
- Includes CRM lookup integration
- Queries backend for customer data
- Shows test data available
- Pre-populated quick test buttons
- Real-time parameter enrichment

**Open locally:**
```bash
open file:///Users/mcacina/Documents/Claude/screenpop-testing/frontend/dashboards/with-crm.html?phone=%2B1(209)%20816-5965
```

---

## 📊 Parameters Explained

### **From 8x8** (Real)
Sent automatically by 8x8:
- `phone`, `email`, `customerId`
- `interactionId`, `mediaType`, `direction`
- `agentId`, `queue`, `timestamp`

### **From CRM** (Inferred)
Queried from backend after receiving phone:
- `firstName`, `lastName`, `tier`
- `claimId`, `claimStatus`, `orderId`
- `caseId`, `contractId`, `productId`
- `lifetime_value`, `sentiment`, `timezone`

**→ Full reference: [PARAMETER_SOURCE_MATRIX.md](docs/PARAMETER_SOURCE_MATRIX.md)**

---

## 🔗 Integration Points

### **8x8 Screen Pop Configuration**
```
Integration → Screen Pop → Custom Target
URL: https://staging.company.com/screenpop-dashboard
Target Type: Custom
Trigger: Offered, Accepted
Media: Phone, Email, Chat
```

### **Backend API Endpoints**
```
GET /api/screenpop/customer?phone=+1(209)816-5965
GET /api/screenpop/customer?email=john@example.com
GET /api/screenpop/customer?customerId=CUST-12345
GET /api/screenpop/test-data
GET /api/screenpop/search?tier=Gold&lob=Warranty
```

### **Expected Response**
```json
{
  "success": true,
  "customer": {
    "customerId": "CUST-12345",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1(209) 816-5965",
    "tier": "Gold",
    "claimId": "CLM-2024-09-001",
    "lifetime_value": 15000,
    ...
  },
  "matchedBy": "phone",
  "timestamp": "2026-02-18T11:50:00Z"
}
```

---

## ✅ Verification Checklist

- [ ] Backend running on port 3002
- [ ] Mock CRM API responds to queries
- [ ] Dashboard opens locally
- [ ] Test lookups work (John Doe)
- [ ] CRM data displays correctly
- [ ] Parameters show [real] and [inferred]
- [ ] No errors in browser console
- [ ] Feature flag can be toggled
- [ ] Rate limiting works
- [ ] Audit logs record lookups

---

## 🚀 Common Commands

```bash
# Start backend
PORT=3002 npm run dev

# Test CRM API
curl http://localhost:3002/api/screenpop/test-data

# Open basic dashboard
open file:///Users/mcacina/Documents/Claude/screenpop-testing/frontend/dashboards/basic.html

# Open advanced dashboard with test data
open file:///Users/mcacina/Documents/Claude/screenpop-testing/frontend/dashboards/with-crm.html?phone=%2B1(209)%20816-5965

# Deploy to staging
git push staging main

# Enable feature flag (staging)
ssh staging "echo '{\"screenpop_test_enabled\": true}' > config/features.json && systemctl restart backend"

# Disable feature flag (emergency rollback)
ssh staging "echo '{\"screenpop_test_enabled\": false}' > config/features.json && systemctl restart backend"

# View audit logs
ssh staging "tail -f /var/log/backend/screenpop-audit.log"

# Check rate limiting
curl -i http://localhost:3002/api/screenpop/test-data  # Repeat 101+ times
```

---

## 📖 Documentation

- **[SCREENPOP_SETUP.md](docs/SCREENPOP_SETUP.md)**
  Complete integration guide, customization, and real CRM connection

- **[SECURE_DEPLOYMENT_GUIDE.md](docs/SECURE_DEPLOYMENT_GUIDE.md)**
  Risk-free deployment in 3 phases, security best practices, rollback procedures

- **[PARAMETER_SOURCE_MATRIX.md](docs/PARAMETER_SOURCE_MATRIX.md)**
  Complete parameter reference, classification, and data flow diagrams

---

## ❓ FAQ

**Q: Will this affect production?**
A: Zero impact. Completely isolated test environment.

**Q: Can real customer data leak?**
A: No. Only mock data in test database.

**Q: How do I add my own test customers?**
A: Edit `backend/services/mock-crm-api.js` → `mockCustomers` array

**Q: What if something breaks?**
A: Disable feature flag (1 command) - production untouched.

**Q: How do I know it's working?**
A: Audit logs show every lookup, test data returns as expected.

**Q: When can we go to production?**
A: After successful staging tests + security review.

---

## 🎯 Next Steps

1. **✅ Phase 1**: Run locally, test parameters
2. **→ Phase 2**: Deploy to staging, test with auth
3. **→ Phase 3**: Test with actual agents in test queue
4. **→ Phase 4**: Connect to real CRM data
5. **→ Phase 5**: Production deployment (after approval)

---

## 📞 Support

- **Issues?** Check [SECURE_DEPLOYMENT_GUIDE.md](docs/SECURE_DEPLOYMENT_GUIDE.md#troubleshooting)
- **Questions?** See parameter reference in [PARAMETER_SOURCE_MATRIX.md](docs/PARAMETER_SOURCE_MATRIX.md)
- **Setup help?** Read [SCREENPOP_SETUP.md](docs/SCREENPOP_SETUP.md)

---

## 📦 What's Included

✅ Mock CRM API with 4 test customers
✅ Basic parameter dashboard (no backend)
✅ Advanced dashboard with CRM integration
✅ Security middleware (auth, rate limiting, audit logs)
✅ Feature flag system for safe testing
✅ 3-phase deployment guide
✅ Complete documentation
✅ Test configuration templates

---

**Ready to test?** Start with Phase 1: [Quick Start](#-quick-start-5-minutes)

**Want details?** Read [SECURE_DEPLOYMENT_GUIDE.md](docs/SECURE_DEPLOYMENT_GUIDE.md)

**Need reference?** See [PARAMETER_SOURCE_MATRIX.md](docs/PARAMETER_SOURCE_MATRIX.md)
