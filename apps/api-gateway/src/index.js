/**
 * API Gateway service that forwards user-related requests to the user service.
 * Includes health, readiness, and proxy endpoints for user CRUD operations.
 */
const express = require('express');
const axios = require('axios');

const app = express();
// Configure the local listening port and downstream user service address.
const PORT = process.env.PORT || 3000;
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';

// Parse incoming JSON payloads 
app.use(express.json());



// Health check endpoints for liveness and readiness probes.
app.get('/health', (req, res) => {
  // Return a simple service health response for readiness/liveness checks.
  res.json({ status: 'healthy', service: 'api-gateway', timestamp: new Date().toISOString() });
});

app.get('/health/live', (req, res) => {
  // Return a lightweight alive response used by liveness probes.
  res.json({ status: 'alive' });
});

// Ready endpoint verifies the user-service dependency.
app.get('/health/ready', async (req, res) => {
  try {
    // Ping the downstream user service health endpoint.
    await axios.get(`${USER_SERVICE_URL}/health`, { timeout: 2000 });
    res.json({ status: 'ready', dependencies: { userService: 'up' } });
  } catch (error) {
    // Downstream service did not respond successfully.
    res.status(503).json({
      status: 'not ready',
      dependencies: { userService: 'down' }
    });
  }
});




// Proxy to User Service: list users.
app.get('/api/users', async (req, res) => {
  try {
    // Forward the request to the user service and return its response body.
    const response = await axios.get(`${USER_SERVICE_URL}/users`);
    // Relay the downstream list of users unchanged.
    res.json(response.data);
  } catch (error) {
    // Log and return a generic bad gateway error when the downstream call fails.
    console.error('Failed to fetch users:', error.message);
    res.status(502).json({ error: 'Failed to fetch users from user-service' });
  }
});

// Proxy to User Service: get user by ID.
app.get('/api/users/:id', async (req, res) => {
  try {
    // Forward parameterized requests to the user service.
    const response = await axios.get(`${USER_SERVICE_URL}/users/${req.params.id}`);
    // Return the single user object from the downstream service.
    res.json(response.data);
  } catch (error) {
    if (error.response?.status === 404) {
      // Translate downstream 404s into gateway 404s.
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Failed to fetch user:', error.message);
    res.status(502).json({ error: 'Failed to fetch user from user-service' });
  }
});

// Proxy to User Service: create a new user.
app.post('/api/users', async (req, res) => {
  try {
    // Forward the incoming JSON body to the user service create endpoint.
    const response = await axios.post(`${USER_SERVICE_URL}/users`, req.body);
    // Return the created user payload from the downstream service.
    res.status(201).json(response.data);
  } catch (error) {
    // Downstream failure is surfaced as a 502.
    console.error('Failed to create user:', error.message);
    res.status(502).json({ error: 'Failed to create user' });
  }
});

// Proxy to User Service: delete a user by ID.
app.delete('/api/users/:id', async (req, res) => {
  try {
    // Forward delete requests to the user service.
    const response = await axios.delete(`${USER_SERVICE_URL}/users/${req.params.id}`);
    // Return no content when delete succeeded.
    res.status(204).send();
  } catch (error) {
    if (error.response?.status === 404) {
      // Propagate not found responses for missing users.
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Failed to delete user:', error.message);
    res.status(502).json({ error: 'Failed to delete user' });
  }
});

// 404 handler for unknown routes.
app.use((req, res) => {
  // Return a not found response for any route that does not match.
  res.status(404).json({ error: 'Not found' });
});

// Generic error handler for unhandled exceptions.
app.use((err, req, res, next) => {
  // Log the error and return a generic internal server error response.
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});



// Start the gateway and begin accepting incoming HTTP requests.
const server = app.listen(PORT, () => {
  console.log(`API Gateway started on port ${PORT}`);
});

module.exports = { app, server };
