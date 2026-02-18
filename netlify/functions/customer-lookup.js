/**
 * Netlify Function: Customer Lookup
 * GET /api/screenpop/customer?phone=+1(209)816-5965
 */

// Mock CRM Database
const mockCustomers = [
  {
    customerId: "CUST-12345",
    phone: "+1(209) 816-5965",
    email: "john.doe@example.com",
    firstName: "John",
    lastName: "Doe",
    accountNumber: "ACC-98765",
    accountId: "SFDC-ACC-001",
    lastInteractionDate: "2026-02-15T14:32:00Z",
    totalInteractions: 47,
    lastInteractionType: "phone",
    claimId: "CLM-2024-09-001",
    claimStatus: "Active",
    claimAmount: 5250,
    orderId: "ORD-54321",
    orderStatus: "Completed",
    caseId: "CASE-789",
    caseStatus: "In Progress",
    contractId: "CON-11111",
    productId: "PROD-WARRANTY-PLUS",
    lineOfBusiness: "Auto Warranty",
    tier: "Gold",
    lifetime_value: 15000,
    sentiment: "Positive",
    timezone: "America/Los_Angeles",
    locale: "en_US",
    preferredContactMethod: "phone",
    createdDate: "2020-03-15",
    lastUpdated: "2026-02-18T10:45:00Z"
  },
  {
    customerId: "CUST-67890",
    phone: "+1(555) 234-5678",
    email: "sarah.smith@example.com",
    firstName: "Sarah",
    lastName: "Smith",
    accountNumber: "ACC-54321",
    accountId: "SFDC-ACC-002",
    lastInteractionDate: "2026-02-10T09:15:00Z",
    totalInteractions: 23,
    lastInteractionType: "email",
    claimId: "CLM-2024-08-015",
    claimStatus: "Closed",
    claimAmount: 1200,
    orderId: "ORD-12345",
    orderStatus: "Processing",
    caseId: "CASE-456",
    caseStatus: "Resolved",
    contractId: "CON-22222",
    productId: "PROD-STANDARD",
    lineOfBusiness: "Home Protection",
    tier: "Silver",
    lifetime_value: 8500,
    sentiment: "Neutral",
    timezone: "America/New_York",
    locale: "en_US",
    preferredContactMethod: "email",
    createdDate: "2021-06-22",
    lastUpdated: "2026-02-18T08:30:00Z"
  },
  {
    customerId: "CUST-11111",
    phone: "+1(415) 555-0123",
    email: "michael.johnson@example.com",
    firstName: "Michael",
    lastName: "Johnson",
    accountNumber: "ACC-11111",
    accountId: "SFDC-ACC-003",
    lastInteractionDate: "2026-02-01T16:45:00Z",
    totalInteractions: 89,
    lastInteractionType: "chat",
    claimId: "CLM-2024-07-042",
    claimStatus: "Pending Review",
    claimAmount: 3500,
    orderId: "ORD-67890",
    orderStatus: "Shipped",
    caseId: "CASE-123",
    caseStatus: "On Hold",
    contractId: "CON-33333",
    productId: "PROD-PREMIUM-ELITE",
    lineOfBusiness: "Business Continuity",
    tier: "Platinum",
    lifetime_value: 42000,
    sentiment: "Very Positive",
    timezone: "America/Chicago",
    locale: "en_US",
    preferredContactMethod: "phone",
    createdDate: "2018-01-10",
    lastUpdated: "2026-02-18T11:20:00Z"
  },
  {
    customerId: "CUST-22222",
    phone: "+1(310) 555-9876",
    email: "emily.brown@example.com",
    firstName: "Emily",
    lastName: "Brown",
    accountNumber: "ACC-22222",
    accountId: "SFDC-ACC-004",
    lastInteractionDate: "2026-01-25T13:20:00Z",
    totalInteractions: 15,
    lastInteractionType: "phone",
    claimId: null,
    claimStatus: "No Active Claims",
    claimAmount: 0,
    orderId: "ORD-99999",
    orderStatus: "Pending",
    caseId: null,
    caseStatus: "No Open Cases",
    contractId: "CON-44444",
    productId: "PROD-STARTER",
    lineOfBusiness: "Retail",
    tier: "Bronze",
    lifetime_value: 2500,
    sentiment: "Neutral",
    timezone: "America/Denver",
    locale: "en_US",
    preferredContactMethod: "email",
    createdDate: "2023-11-05",
    lastUpdated: "2026-02-18T09:10:00Z"
  }
];

// Sanitize phone number (remove non-digits)
function sanitizePhone(phone) {
  if (!phone) return null;
  return phone.replace(/\D/g, '');
}

// Search customer by phone, email, or customerId
function searchCustomer(phone, email, customerId) {
  if (phone) {
    const sanitized = sanitizePhone(phone);
    const customer = mockCustomers.find(c => sanitizePhone(c.phone) === sanitized);
    if (customer) return customer;
  }

  if (email) {
    const customer = mockCustomers.find(c => c.email.toLowerCase() === email.toLowerCase());
    if (customer) return customer;
  }

  if (customerId) {
    const customer = mockCustomers.find(c => c.customerId === customerId);
    if (customer) return customer;
  }

  return null;
}

// Main handler
exports.handler = async (event) => {
  try {
    // Log audit
    console.log(`[SCREENPOP] Customer lookup: ${JSON.stringify(event.queryStringParameters)}`);

    const { phone, email, customerId } = event.queryStringParameters || {};

    // Validation
    if (!phone && !email && !customerId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Must provide one of: phone, email, or customerId'
        })
      };
    }

    // Search
    const customer = searchCustomer(phone, email, customerId);

    if (!customer) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: 'Customer not found'
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(customer)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error'
      })
    };
  }
};
