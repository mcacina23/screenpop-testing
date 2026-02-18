# Quick Start Guide: Screen Pop Testing

**Get up and running in 5 minutes with zero risk**

---

## 🟢 Phase 1: Local Testing (RIGHT NOW)

### **Step 1: Start Backend** (2 min)

```bash
cd /Users/mcacina/Documents/Claude/screenpop-testing

# Start backend on test port (not 3001, not production)
PORT=3002 npm run dev

# You should see:
# ✓ Server running on port 3002
# ✓ Mock CRM database loaded
# ✓ 4 test customers ready
```

### **Step 2: Test the API** (1 min)

Open a new terminal:

```bash
# Test that CRM API is working
curl http://localhost:3002/api/screenpop/test-data

# Should return 4 test customers:
# John Doe, Sarah Smith, Michael Johnson, Emily Brown
```

### **Step 3: Open Dashboard** (1 min)

```bash
# Open the advanced dashboard with CRM integration
open "file:///Users/mcacina/Documents/Claude/screenpop-testing/frontend/dashboards/with-crm.html"
```

### **Step 4: Test Lookup** (1 min)

In the dashboard:

1. Click the button: **"John Doe: +1(209) 816-5965"**
2. Watch the CRM data appear:
   - ✅ Phone: +1(209) 816-5965
   - ✅ Name: John Doe
   - ✅ Tier: Gold
   - ✅ Claim: CLM-2024-09-001
   - ✅ Lifetime Value: $15,000
3. Check the **Parameter Display** section
   - Parameters should show [real] and [inferred] badges
   - All data populated from mock CRM

**✅ PHASE 1 COMPLETE: Local testing working!**

---

## 🟡 Phase 2: Staging Deployment (Later)

When ready to test with real 8x8 integration:

### **Deploy to Staging Server:**

```bash
# 1. Push to staging
git push staging main

# 2. Enable feature flag (SSH to staging server)
ssh staging-server
echo '{"screenpop_test_enabled": true}' > config/features.json
systemctl restart backend

# 3. Verify it's running
curl -H "Authorization: Bearer $TEST_TOKEN" \
  https://staging.company.com/api/screenpop/customer?phone=%2B1(209)816-5965

# Should return John Doe's data
```

### **Configure 8x8 (In Configuration Manager):**

```
Integration → Screen Pop → Custom Target
├── Enable: YES
├── Target URL: https://staging.company.com/screenpop-dashboard
├── Trigger: Call Offered
├── Media Types: Phone, Email
└── Test: YES (only test queue)
```

### **Create Test Queue (In 8x8):**

```
Queues → New Queue
├── Name: SCREENPOP_TEST
├── Agents: agent-test-1, agent-test-2, agent-test-3
├── Routing: Manual (no customer calls)
└── Purpose: Testing only
```

**✅ PHASE 2 COMPLETE: Staging configured!**

---

## 🔴 Phase 3: Agent Workspace Testing (After Phase 2)

### **Create Test Agents:**

In 8x8 CM → Users:
- `agent-test-1@company.com` → Assign to SCREENPOP_TEST queue
- `agent-test-2@company.com` → Assign to SCREENPOP_TEST queue
- `agent-test-3@company.com` → Assign to SCREENPOP_TEST queue

### **Make Test Calls:**

Using test phone numbers:
1. `+1(209) 816-5965` → Agent Test 1
   - Screen pop opens
   - Shows John Doe's data
   - Claim CLM-2024-09-001 visible

2. `+1(555) 234-5678` → Agent Test 2
   - Screen pop opens
   - Shows Sarah Smith's data
   - Silver tier customer

3. `+1(415) 555-0123` → Agent Test 3
   - Screen pop opens
   - Shows Michael Johnson's data
   - Platinum tier, high value

### **Monitor Results:**

```bash
# Watch audit logs (on staging server)
tail -f /var/log/backend/screenpop-audit.log

# Should see:
# [SCREENPOP] User: agent-test-1@company.com, Query: {phone: +1(209)816-5965}
# [SCREENPOP] User: agent-test-2@company.com, Query: {phone: +1(555)234-5678}
```

**✅ PHASE 3 COMPLETE: Agent workspace testing successful!**

---

## 🔧 Troubleshooting

### **Backend won't start**
```bash
# Check if port 3002 is in use
lsof -i :3002

# Kill if needed
kill -9 <PID>

# Restart
PORT=3002 npm run dev
```

### **Dashboard shows "Could not load test data"**
```bash
# Make sure backend is running
curl http://localhost:3002/api/screenpop/test-data

# If error: Backend not started - run PORT=3002 npm run dev

# If CORS error: Check backend URL in dashboard
# Update: const API_BASE = 'http://localhost:3002'
```

### **CRM lookup fails in staging**
```bash
# Check authentication token
echo $TEST_TOKEN

# If empty: Get token from admin
# Then retry:
curl -H "Authorization: Bearer $TEST_TOKEN" \
  https://staging.company.com/api/screenpop/customer?phone=%2B1(209)816-5965
```

### **Screen pop doesn't open in 8x8**
```bash
# Check feature flag is enabled
ssh staging "cat config/features.json | grep screenpop_test_enabled"

# Should show: "screenpop_test_enabled": true

# If false: Enable it
ssh staging 'echo "{\"screenpop_test_enabled\": true}" > config/features.json && systemctl restart backend'
```

---

## ✅ Quick Checklist

### **Before Testing**
- [ ] Backend running on port 3002
- [ ] Dashboard opens locally
- [ ] CRM API responds to queries
- [ ] Test phone numbers ready

### **During Local Testing**
- [ ] John Doe lookup works
- [ ] CRM data displays
- [ ] Parameters show [real] vs [inferred]
- [ ] No errors in browser console

### **Before Staging**
- [ ] Feature flag OFF by default
- [ ] Mock data confirmed
- [ ] Auth middleware added
- [ ] Rate limiting configured

### **Before Agent Testing**
- [ ] Test agents created
- [ ] Test queue isolated
- [ ] Feature flag enabled for test queue
- [ ] Monitoring enabled

### **After Testing**
- [ ] Feature flag OFF
- [ ] Test agents deleted
- [ ] Audit logs reviewed
- [ ] Findings documented

---

## 📊 Test Data

### **Pre-loaded Customers:**

| Phone | Name | Tier | Status |
|-------|------|------|--------|
| +1(209) 816-5965 | John Doe | Gold | Active claim |
| +1(555) 234-5678 | Sarah Smith | Silver | Recent email |
| +1(415) 555-0123 | Michael Johnson | Platinum | 89 interactions |
| +1(310) 555-9876 | Emily Brown | Bronze | New customer |

**To add more:** Edit `backend/services/mock-crm-api.js` → Search for `mockCustomers`

---

## 🔐 Security Reminders

✅ **DO:**
- Use feature flag to enable/disable
- Test in staging first
- Use test agents only (not real)
- Use test queue only (not customer-facing)
- Monitor audit logs
- Keep mock data only

❌ **DON'T:**
- Connect to production database
- Use real customer phone numbers
- Route customer calls to test queue
- Disable authentication
- Test without audit logging
- Deploy directly to production

---

## 🚀 Commands Reference

```bash
# Start backend
PORT=3002 npm run dev

# Test API
curl http://localhost:3002/api/screenpop/test-data

# Open basic dashboard
open file:///Users/mcacina/Documents/Claude/screenpop-testing/frontend/dashboards/basic.html

# Open advanced dashboard
open file:///Users/mcacina/Documents/Claude/screenpop-testing/frontend/dashboards/with-crm.html

# Deploy to staging
git push staging main

# Enable feature flag (staging)
ssh staging "echo '{\"screenpop_test_enabled\": true}' > config/features.json && systemctl restart backend"

# Disable feature flag (emergency)
ssh staging "echo '{\"screenpop_test_enabled\": false}' > config/features.json && systemctl restart backend"

# View logs
ssh staging "tail -f /var/log/backend/screenpop-audit.log"

# Test with auth
curl -H "Authorization: Bearer $TEST_TOKEN" \
  https://staging.company.com/api/screenpop/customer?phone=%2B1(209)816-5965
```

---

## 📖 Documentation

- **Local Testing:** This file (QUICK_START.md)
- **Setup & Integration:** [docs/SCREENPOP_SETUP.md](docs/SCREENPOP_SETUP.md)
- **Deployment Guide:** [docs/SECURE_DEPLOYMENT_GUIDE.md](docs/SECURE_DEPLOYMENT_GUIDE.md)
- **Parameter Reference:** [docs/PARAMETER_SOURCE_MATRIX.md](docs/PARAMETER_SOURCE_MATRIX.md)

---

## ✨ You're Ready!

**Next action:** Run `PORT=3002 npm run dev` and test locally

**Questions?** See [docs/SECURE_DEPLOYMENT_GUIDE.md](docs/SECURE_DEPLOYMENT_GUIDE.md#troubleshooting)

**Need help?** Check the FAQ in main [README.md](README.md#-faq)

Good luck! 🚀
