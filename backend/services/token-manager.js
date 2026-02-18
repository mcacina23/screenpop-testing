/**
 * JWT Token Manager
 * Generate tokens for testing and production use
 */

const { generateToken } = require('./screenpop-security');

// Test users for development/testing
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

/**
 * Generate test tokens for all test users
 * Use these tokens for testing the API
 */
function generateTestTokens() {
  const tokens = {};
  Object.entries(testUsers).forEach(([key, user]) => {
    tokens[key] = generateToken(user);
  });
  return tokens;
}

/**
 * Print tokens to console for easy copy-paste
 * Usage: node -e "require('./backend/services/token-manager').printTokens()"
 */
function printTokens() {
  const tokens = generateTestTokens();
  console.log('\n🔐 TEST TOKENS (expires in 24 hours)\n');
  console.log('Admin Token:');
  console.log(`  ${tokens.admin}\n`);
  console.log('QA Token:');
  console.log(`  ${tokens.qa}\n`);
  console.log('Tester Token:');
  console.log(`  ${tokens.tester}\n`);
}

module.exports = {
  testUsers,
  generateTestTokens,
  printTokens
};
