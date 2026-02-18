# Screen Pop Testing Setup Guide

## 🚀 Quick Start

### **Step 1: Add Mock CRM to Your Backend**

Copy `mock-crm-api.js` into your backend project:

```bash
cp mock-crm-api.js packages/backend/services/
```

### **Step 2: Initialize Routes in Your Backend** (`server.js` or `app.js`)

```javascript
// In your Express app setup
const { createCrmRoutes } = require('./services/mock-crm-api');

// Add these routes
createCrmRoutes(app);

// Now available:
// GET /api/screenpop/customer?phone=+1(209)816-5965
// GET /api/screenpop/customer?email=john.doe@example.com
// GET /api/screenpop/customer?customerId=CUST-12345
// GET /api/screenpop/test-data
```

### **Step 3: Start Your Backend**

```bash
cd packages/backend
npm install  # if needed
npm run dev
```

Verify it's working:
```bash
curl "http://localhost:3001/api/screenpop/test-data"
```

Should return JSON with 4 test customers.

### **Step 4: Open the Dashboard**

```bash
# Option A: Local file
open file:///Users/mcacina/Documents/Claude/backlog_analysis_enhanced/screenpop-debug-dashboard-with-crm.html

# Option B: Host on your backend (see below)
open http://localhost:3001/screenpop-dashboard
```

### **Step 5: Test with Sample Phone Numbers**

In the dashboard, try:
- `+1(209) 816-5965` → John Doe (Premium customer with active claim)
- `+1(555) 234-5678` → Sarah Smith (Silver tier, recent email interaction)
- `+1(415) 555-0123` → Michael Johnson (Platinum tier, most interactions)

---

## 📊 Parameter Source Matrix

### **Category 1: Real 8x8 Parameters** ✅
These come directly from 8x8 when screen pop is triggered:

| Parameter | Source | Example | Notes |
|-----------|--------|---------|-------|
| `phone` | Caller ANI | `+1(209) 816-5965` | **REQUIRED** - Used for CRM lookup |
| `ani` | Automatic Number ID | `2098165965` | Same as phone, different format |
| `email` | Call metadata | `john@example.com` | For email interactions |
| `customerId` | 8x8 stored value | `CUST-12345` | If tenant configured |
| `interactionId` | 8x8 system | `INT-2026-02-18-001` | Unique per call/email/chat |
| `mediaType` | Channel type | `phone`, `email`, `chat`, `voicemail` | What channel triggered pop |
| `direction` | Call direction | `inbound`, `outbound` | For routing context |
| `agentId` | 8x8 user ID | `AGENT-001` | Agent handling interaction |
| `queue` | Queue name | `support`, `sales` | Assigned queue |
| `timestamp` | Unix time | `1708269600` | Call start time |

### **Category 2: CRM Lookup Data** 🔍
These come from your external CRM database when phone/email/customerId is looked up:

| Parameter | CRM Field | Example | How It's Used |
|-----------|-----------|---------|---------------|
| `firstName` | customer.first_name | `John` | Combined with lastName for greeting |
| `lastName` | customer.last_name | `Doe` | Combined with firstName |
| `accountNumber` | customer.account_id | `ACC-98765` | Link to billing system |
| `accountId` | customer.salesforce_id | `SFDC-ACC-001` | CRM system ID |
| `tier` | customer.segment | `Gold`, `Silver`, `Bronze` | Prioritize VIP customers |
| `lifetime_value` | customer.ltv | `15000` | Show value of customer |
| `claimId` | customer.active_claim | `CLM-2024-09-001` | Context for agent |
| `claimStatus` | customer.claim_status | `Active` | What agent should know |
| `claimAmount` | customer.claim_value | `5250.00` | Financial context |
| `orderId` | customer.last_order | `ORD-54321` | Order context |
| `caseId` | customer.support_case | `CASE-789` | Support ticket context |
| `contractId` | customer.contract_id | `CON-11111` | Service agreement |
| `productId` | customer.product_id | `PROD-WARRANTY-PLUS` | What they bought |
| `lineOfBusiness` | customer.lob | `Auto Warranty` | Business classification |
| `sentiment` | crm_sentiment | `Positive` | Customer satisfaction level |
| `timezone` | customer.timezone | `America/Los_Angeles` | Agent localization |
| `preferredContactMethod` | customer.contact_pref | `phone`, `email` | Respect preferences |

### **Category 3: Derived/Assumed Parameters** ⚠️
These are calculated or assumed (not directly from 8x8 or CRM):

| Parameter | Source | Status | Alternative |
|-----------|--------|--------|-------------|
| `lastInteractionDate` | CRM history | Supported | Query interaction API |
| `totalInteractions` | CRM aggregate | Supported | Count from analytics |
| `callDuration` | 8x8 interaction | Can add | Available post-call |
| `startTime` | 8x8 + format | Can add | Convert timestamp |
| `agentName` | 8x8 user lookup | Can add | Call user service |
| `agentExtension` | 8x8 directory | Can add | Call directory service |
| `team` | Agent properties | Can add | Call agent service |
| `skillId` | Agent skills | Can add | Call skills service |
| `campaignId` | Outbound config | Supported | For outbound calls |
| `priority` | 8x8 routing | Can add | In call data |
| `notes` | Interaction history | Can add | Query history API |
| `tags` | CRM + 8x8 | Can add | Merge sources |

---

## 🔄 Data Flow Diagram

```
8x8 System Event (Agent gets call)
        ↓
Screen Pop triggered with:
  - phone (+1 209 816-5965)
  - interactionId (INT-001)
  - mediaType (phone)
  - agentId (AGENT-001)
  - queue (support)
        ↓
Your Screen Pop Page Opens
        ↓
JS extracts: ?phone=+1(209)816-5965&...
        ↓
JS calls: /api/screenpop/customer?phone=+1(209)816-5965
        ↓
Backend Queries CRM Database
        ↓
CRM Returns:
  {
    customerId: "CUST-12345",
    firstName: "John",
    lastName: "Doe",
    claimId: "CLM-2024-09-001",
    tier: "Gold",
    ... (all CRM fields)
  }
        ↓
Page Displays:
  ✓ From 8x8 (phone, interactionId, mediaType)
  ✓ From CRM (firstName, lastName, claimId, tier)
  ✓ Combined context shown to agent
```

---

## 🧪 Test Scenarios

### **Scenario 1: Basic Phone Pop**
```
URL: screenpop-debug-dashboard-with-crm.html?phone=%2B1(209)%20816-5965
Expected:
  ✓ Phone populated from URL
  ✓ Click "Search" → CRM lookup
  ✓ John Doe's data appears
  ✓ Shows claim CLM-2024-09-001
  ✓ Tier = Gold
```

### **Scenario 2: Email With Customer ID**
```
URL: ?email=john.doe@example.com&customerId=CUST-12345
Expected:
  ✓ Email + customerId shown
  ✓ CRM can lookup by customerId
  ✓ Returns same John Doe record
```

### **Scenario 3: Missing Customer**
```
URL: ?phone=+1(999)999-9999
Expected:
  ✓ Phone shown from 8x8
  ✓ CRM lookup returns 404
  ✓ Dashboard shows "Not found"
  ✓ Graceful fallback to limited data
```

---

## 🛠️ Customization

### **Add Your Own Test Customers**

Edit `mock-crm-api.js` and add to `mockCustomers` array:

```javascript
const mockCustomers = [
  // ... existing
  {
    customerId: 'CUST-YOUR-ID',
    phone: '+1(XXX) XXX-XXXX',
    email: 'your@email.com',
    firstName: 'Your',
    lastName: 'Customer',
    accountNumber: 'ACC-YOURS',
    // ... add other fields
  }
];
```

Then restart backend and use in testing.

### **Connect to Real CRM**

Replace the mock search in `mock-crm-api.js`:

```javascript
// BEFORE (mock):
function searchCustomer(phone, email, customerId) {
  return mockCustomers.find(c => ...);
}

// AFTER (real CRM):
async function searchCustomer(phone, email, customerId) {
  if (phone) {
    return await salesforce.query(`SELECT * FROM Account WHERE Phone = '${phone}'`);
  }
  // ... etc
}
```

---

## 📝 Parameter Reference for 8x8 Configuration

When configuring screen pop in 8x8 CM, you can use these placeholders:

**Standard 8x8 Variables:**
```
{phone}          - Caller phone number
{email}          - Caller email
{customerId}     - Stored customer ID
{interactionId}  - Unique interaction ID
{agentId}        - Agent identifier
{queue}          - Queue name
{timestamp}      - Unix timestamp
```

**Example URLs:**
```
https://crm.company.com/search?phone={phone}&interactionId={interactionId}
https://claims.company.com/lookup?customerId={customerId}&agent={agentId}
```

8x8 will substitute real values when screen pop triggers.

---

## ✅ Verification Checklist

- [ ] Backend running at localhost:3001
- [ ] CRM API responds to `/api/screenpop/customer?phone=...`
- [ ] Dashboard can reach backend (check browser console for CORS errors)
- [ ] Test customer queries work (John Doe, Sarah Smith, Michael Johnson)
- [ ] CRM data displays in parameter panel
- [ ] Parameters show [real] vs [inferred] badges
- [ ] Can copy parameter values to clipboard
- [ ] URL parameter extraction works

---

## 🐛 Troubleshooting

### **"Failed to fetch" or CORS error**
```
Problem: Dashboard can't reach backend
Solution:
  1. Ensure backend is running: npm run dev
  2. Check API is on localhost:3001
  3. If different port, edit dashboard:
     const API_BASE = 'http://localhost:YOUR_PORT';
  4. Backend may need CORS headers
```

### **"Customer not found"**
```
Problem: CRM query returns 404
Solution:
  1. Check phone format matches mock data
  2. Use test buttons (pre-populated)
  3. Verify mock-crm-api.js is loaded
  4. Check server console for errors
```

### **Inferred fields not showing**
```
Problem: CRM data loads but params aren't updating
Solution:
  1. Verify CRM response includes all fields
  2. Check response format matches expected structure
  3. Browser console should show full CRM object
```

---

## 🚀 Next Steps

1. **Test with real 8x8 integration:**
   - Configure screen pop in 8x8 CM
   - Use dashboard URL as target
   - Trigger calls and see data flow

2. **Connect to real CRM:**
   - Swap mock data for real API calls
   - Use Salesforce/Zendesk/NetSuite APIs
   - Add authentication if needed

3. **Add more parameters:**
   - Extend mock database with more fields
   - Update 8x8 configuration to pass more context
   - Enhance dashboard display

4. **Production deployment:**
   - Host dashboard on secure HTTPS server
   - Use production CRM credentials
   - Add rate limiting and monitoring
