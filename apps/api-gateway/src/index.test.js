// Minimal integration tests for the API Gateway.
// Verifies health and default route behavior.
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');

// Start the API Gateway server 
const { app, server } = require('./index');

// Helper for sending HTTP requests to the local test server.
const makeRequest = (path, method = 'GET') => {
  // Build a raw HTTP request against the started test server.
  // The helper resolves with parsed JSON response body when the request completes.
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: 'localhost', port: server.address().port, path, method },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, body: data ? JSON.parse(data) : null });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
};

describe('API Gateway', () => {
  after(() => {
    // Close the server after the tests run to release the bound port.
    server.close();
  });

  it('GET /health should return healthy status', async () => {
    // Confirm the gateway health endpoint returns the expected service health payload.
    const res = await makeRequest('/health');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'healthy');
    assert.strictEqual(res.body.service, 'api-gateway');
  });

  it('GET /health/live should return alive', async () => {
    // Confirm the live probe returns an alive status.
    const res = await makeRequest('/health/live');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'alive');
  });

  it('GET /unknown should return 404', async () => {
    // Confirm unknown routes are rejected with a 404.
    const res = await makeRequest('/unknown');
    assert.strictEqual(res.statusCode, 404);
  });
});
