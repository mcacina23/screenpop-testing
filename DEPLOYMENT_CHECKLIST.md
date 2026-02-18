# Screen Pop Testing - Deployment Checklist

## 🟢 Phase 1: Local Testing Checklist

### Before Starting
- [ ] Node.js installed (npm available)
- [ ] Port 3002 is free (not in use)
- [ ] Backend code ready
- [ ] Dashboard files available

### During Setup
- [ ] Backend starts without errors on port 3002
- [ ] Mock CRM loads with 4 test customers
- [ ] API responds to `http://localhost:3002/api/screenpop/test-data`
- [ ] Dashboard HTML files open in browser
- [ ] No CORS errors in browser console

### Testing
- [ ] Basic dashboard opens (basic.html)
- [ ] Advanced dashboard opens (with-crm.html)
- [ ] Test button clicks work (John Doe, Sarah Smith, Michael Johnson)
- [ ] CRM lookup returns data
- [ ] Parameters display with [real] and [inferred] badges
- [ ] Copy-to-clipboard works
- [ ] No console errors

### Completion
- [ ] All 4 test customers searchable
- [ ] Data displays correctly
- [ ] Zero production data visible
- [ ] Ready to move to Phase 2

---

## 🟡 Phase 2: Staging Deployment Checklist

### Staging Server Setup
- [ ] Staging backend server accessible
- [ ] Port 3002 available on staging
- [ ] Database connection to STAGING database only
- [ ] No connection to production database

### Code Deployment
- [ ] Code pushed to staging branch
- [ ] Middleware installed (auth, rate limiting)
- [ ] Feature flag config created
- [ ] Mock CRM API loaded
- [ ] Environment variables set (TEST/STAGING)

### Security Configuration
- [ ] Authentication middleware enabled
- [ ] JWT token validation working
- [ ] Rate limiting configured (100/hour)
- [ ] Audit logging enabled
- [ ] Firewall allows internal only (blocks external)
- [ ] HTTPS certificate valid
- [ ] Feature flag defaults to OFF

### Backend Testing
- [ ] Backend starts without errors
- [ ] API responds to `/api/screenpop/test-data`
- [ ] Mock data (only 4 customers) returned
- [ ] Authentication required for endpoints
- [ ] Rate limiting blocks after 100 requests
- [ ] Audit logs record all queries
- [ ] Feature flag can enable/disable

### Dashboard Configuration
- [ ] Dashboard updated to use staging URL
- [ ] Auth token field populated
- [ ] API calls include auth headers
- [ ] No hardcoded production URLs

### Monitoring Setup
- [ ] Audit logs viewable
- [ ] Error logging configured
- [ ] Performance metrics tracked
- [ ] Alerting configured for errors

### Completion
- [ ] Feature flag works (ON/OFF)
- [ ] Auth prevents unauthorized access
- [ ] Rate limiting tested
- [ ] Mock data only
- [ ] All logging working
- [ ] Ready for agent testing

---

## 🔴 Phase 3: Agent Workspace Testing Checklist

### 8x8 Configuration (CM Interface)
- [ ] Test agents created (agent-test-1@, agent-test-2@, agent-test-3@)
- [ ] Test queue created (SCREENPOP_TEST)
- [ ] Test agents assigned to test queue ONLY
- [ ] Test agents NOT assigned to customer-facing queues
- [ ] Test queue NOT configured for customer routing
- [ ] Screen pop enabled for test queue ONLY
- [ ] Screen pop URL points to staging dashboard
- [ ] Screen pop trigger set to "Call Offered"
- [ ] Media types: Phone, Email, Chat (as needed)

### Test Setup
- [ ] Test phone numbers configured
- [ ] Routes set to test queue (not customer queues)
- [ ] Test agents logged in and ready
- [ ] Monitoring dashboard open
- [ ] Audit logs being collected

### Live Testing
- [ ] Test call 1: +1(209) 816-5965 → Agent 1
  - [ ] Screen pop opens
  - [ ] John Doe's data displayed
  - [ ] Claim CLM-2024-09-001 visible
  - [ ] No errors

- [ ] Test call 2: +1(555) 234-5678 → Agent 2
  - [ ] Screen pop opens
  - [ ] Sarah Smith's data displayed
  - [ ] Silver tier visible
  - [ ] No errors

- [ ] Test call 3: +1(415) 555-0123 → Agent 3
  - [ ] Screen pop opens
  - [ ] Michael Johnson's data displayed
  - [ ] Platinum tier, high value visible
  - [ ] No errors

### Observation
- [ ] All parameters display correctly
- [ ] [real] parameters from 8x8 present
- [ ] [inferred] parameters from CRM present
- [ ] No production data visible
- [ ] CRM lookups working
- [ ] Response time < 3 seconds
- [ ] No error messages to agents
- [ ] Audit logs record all lookups
- [ ] Rate limiting not triggered (only 3 calls)

### Verification
- [ ] Zero impact on production agents
- [ ] Zero customer calls affected
- [ ] Zero production data exposed
- [ ] Test queue isolated from customer traffic
- [ ] Feature flag still works (can disable)
- [ ] Rollback plan verified

### Completion
- [ ] All 3 test calls successful
- [ ] Data displays as expected
- [ ] No security issues
- [ ] Audit trail complete
- [ ] Production unaffected
- [ ] Ready for decision on next phase

---

## 🛑 Rollback Checklist (If Issues Found)

### Immediate Actions (< 5 minutes)
- [ ] Disable feature flag (1 command)
- [ ] Verify feature flag OFF
- [ ] Disconnect test agents
- [ ] Block port 3002 at firewall (if needed)
- [ ] Restart production backend
- [ ] Verify production unaffected

### Investigation
- [ ] Review audit logs for errors
- [ ] Check browser console for errors
- [ ] Review network requests
- [ ] Document what went wrong
- [ ] Identify root cause

### Fix and Retry
- [ ] Fix identified issue
- [ ] Test locally (Phase 1)
- [ ] Redeploy to staging
- [ ] Retry Phase 2 & 3

### If Major Issues
- [ ] Remove test code from staging
- [ ] Verify production clean
- [ ] Schedule post-mortem
- [ ] Plan improvements
- [ ] Retry with changes

---

## 📋 Sign-Off Checklist

### Local Testing Complete
- Tester: _______________
- Date: _______________
- Issues: None / [List]
- Approval: ✅ Proceed to Staging

### Staging Testing Complete
- Tester: _______________
- Date: _______________
- Issues: None / [List]
- Approval: ✅ Proceed to Agent Testing

### Agent Testing Complete
- Tester: _______________
- Date: _______________
- Issues: None / [List]
- Approval: ✅ Ready for next phase OR ❌ Needs fixes

### Security Review Complete
- Reviewer: _______________
- Date: _______________
- Concerns: None / [List]
- Approval: ✅ Approved OR ⚠️ Conditional

### Operations Approved
- Approver: _______________
- Date: _______________
- Conditions: None / [List]
- Approval: ✅ Approved OR 🛑 Blocked

---

## 🎯 Success Criteria

### Phase 1 Success
✅ Backend starts on port 3002
✅ Dashboard opens locally
✅ All 4 test customers searchable
✅ CRM data displays
✅ Zero errors in console

### Phase 2 Success
✅ Feature flag ON/OFF works
✅ Authentication required
✅ Rate limiting enforced
✅ Audit logs record queries
✅ Mock data only (4 customers)
✅ Internal network only (firewall blocks external)

### Phase 3 Success
✅ Test agents can trigger screen pop
✅ Screen pop opens with correct dashboard
✅ CRM data displays for test customers
✅ All parameters show [real] and [inferred]
✅ Zero production impact
✅ Zero customer impact
✅ Audit logs complete

### Overall Success
✅ Framework tested and verified
✅ Security validated
✅ No production risk
✅ Zero data leaks
✅ Ready for next phase (real CRM integration)

---

## 📞 Quick Decision Tree

**Q: Is the backend running?**
- No → Run: `PORT=3002 npm run dev`
- Yes → Continue

**Q: Does the API respond?**
- No → Check backend logs, restart
- Yes → Continue

**Q: Does dashboard open?**
- No → Check browser console, verify URL path
- Yes → Continue

**Q: Does CRM lookup work?**
- No → Check API response, verify mock data loaded
- Yes → Continue

**Q: Ready for staging?**
- Issues found → Fix locally, restart Phase 1
- No issues → Deploy to staging (Phase 2)

**Q: Ready for agent testing?**
- Staging issues → Fix on staging, retry Phase 2
- Staging working → Deploy agent testing (Phase 3)

**Q: Ready for production?**
- Phase 3 issues → Fix, retry Phase 3
- Phase 3 working → Plan real CRM integration (Phase 4)

---

## ⏱️ Timeline Estimate

| Phase | Task | Time | Risk |
|-------|------|------|------|
| 1 | Local testing | 30 min | ✅ None |
| 2 | Staging setup | 1-2 hours | ✅ Low |
| 2 | Staging testing | 1-2 hours | ✅ Low |
| 3 | Agent testing | 1-2 hours | ✅ Medium |
| 3 | Monitoring | Ongoing | ✅ Medium |
| 4 | Real CRM integration | 2-4 hours | ⚠️ Medium |
| 5 | Production planning | 1-2 weeks | ⚠️ High |

**Total:** ~1 week to production-ready

---

## 🔐 Security Verification

Before moving to each phase:

**Phase 1 → Phase 2:**
- [ ] No real customer data anywhere
- [ ] Port 3002 not exposed externally
- [ ] Only test data in mock database
- [ ] All errors documented

**Phase 2 → Phase 3:**
- [ ] Feature flag working (ON/OFF)
- [ ] Auth middleware blocking unauthorized access
- [ ] Rate limiting preventing abuse
- [ ] Audit logs recording all activity
- [ ] Firewall blocking external access
- [ ] HTTPS certificate valid

**Phase 3 → Phase 4 (Real CRM):**
- [ ] Agent testing successful
- [ ] Zero production impact observed
- [ ] Zero data leaks detected
- [ ] Audit trail complete
- [ ] Security review passed

---

This checklist ensures safe, controlled progression through all testing phases with zero risk to production.
