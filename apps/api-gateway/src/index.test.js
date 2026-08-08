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
        // Collect response chunks into a complete payload string.
        res.on('data', (chunk) => (data += chunk));
        // When the response ends, parse JSON and resolve the promise.
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, body: data ? JSON.parse(data) : null });
        });
      }
    );
    // Reject the promise if any network error occurs.
    req.on('error', reject);
    // Send the request to the server.
    req.end();
  });
};

describe('API Gateway', () => {
  after(() => {
    // Close the server after the tests run to release the bound port.
    server.close();
  });

  it('GET /health should return healthy status', async () => {
    // Send a GET request to the health endpoint.
    const res = await makeRequest('/health');
    // Assert that the response code and returned health fields are correct.
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'healthy');
    assert.strictEqual(res.body.service, 'api-gateway');
  });

  it('GET /health/live should return alive', async () => {
    // Send a GET request to the live probe endpoint.
    const res = await makeRequest('/health/live');
    // Assert that the live probe reports the service is alive.
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'alive');
  });

  it('GET /unknown should return 404', async () => {
    // Send a GET request to an undefined route.
    const res = await makeRequest('/unknown');
    // Assert that the service returns a 404 for unknown paths.
    assert.strictEqual(res.statusCode, 404);
  });
});
