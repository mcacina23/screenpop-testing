/**
 * Netlify Function: Get all test data
 * GET /api/screenpop/test-data
 */

const testCustomers = [
  {
    customerId: "CUST-12345",
    phone: "+1(209) 816-5965",
    email: "john.doe@example.com",
    firstName: "John",
    lastName: "Doe",
    tier: "Gold",
    lifetime_value: 15000
  },
  {
    customerId: "CUST-67890",
    phone: "+1(555) 234-5678",
    email: "sarah.smith@example.com",
    firstName: "Sarah",
    lastName: "Smith",
    tier: "Silver",
    lifetime_value: 8500
  },
  {
    customerId: "CUST-11111",
    phone: "+1(415) 555-0123",
    email: "michael.johnson@example.com",
    firstName: "Michael",
    lastName: "Johnson",
    tier: "Platinum",
    lifetime_value: 42000
  },
  {
    customerId: "CUST-22222",
    phone: "+1(310) 555-9876",
    email: "emily.brown@example.com",
    firstName: "Emily",
    lastName: "Brown",
    tier: "Bronze",
    lifetime_value: 2500
  }
];

exports.handler = async (event) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      customers: testCustomers,
      count: testCustomers.length,
      timestamp: new Date().toISOString()
    })
  };
};
