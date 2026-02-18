/**
 * Netlify Function: Health Check
 * GET /.netlify/functions/health
 */

exports.handler = async (event) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      status: 'ok',
      service: 'Screen Pop Testing API',
      feature: 'enabled',
      timestamp: new Date().toISOString()
    })
  };
};
