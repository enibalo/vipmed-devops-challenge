/**
 * API Gateway service that forwards user-related requests to the user service.
 * Includes health, readiness, and proxy endpoints for user CRUD operations.
 */
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';


app.use(express.json());



// Health check endpoints for liveness and readiness probes.
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'api-gateway', timestamp: new Date().toISOString() });
});

app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Ready endpoint verifies the user-service dependency.
app.get('/health/ready', async (req, res) => {
  try {
    await axios.get(`${USER_SERVICE_URL}/health`, { timeout: 2000 });
    res.json({ status: 'ready', dependencies: { userService: 'up' } });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      dependencies: { userService: 'down' }
    });
  }
});




// Proxy to User Service: list users.
app.get('/api/users', async (req, res) => {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/users`);
    res.json(response.data);
  } catch (error) {
    console.error('Failed to fetch users:', error.message);
    res.status(502).json({ error: 'Failed to fetch users from user-service' });
  }
});

// Proxy to User Service: get user by ID.
app.get('/api/users/:id', async (req, res) => {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/users/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Failed to fetch user:', error.message);
    res.status(502).json({ error: 'Failed to fetch user from user-service' });
  }
});

// Proxy to User Service: create a new user.
app.post('/api/users', async (req, res) => {
  try {
    const response = await axios.post(`${USER_SERVICE_URL}/users`, req.body);
    res.status(201).json(response.data);
  } catch (error) {
    console.error('Failed to create user:', error.message);
    res.status(502).json({ error: 'Failed to create user' });
  }
});

// Proxy to User Service: delete a user by ID.
app.delete('/api/users/:id', async (req, res) => {
  try {
    const response = await axios.delete(`${USER_SERVICE_URL}/users/${req.params.id}`);
    res.status(204).send();
  } catch (error) {
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Failed to delete user:', error.message);
    res.status(502).json({ error: 'Failed to delete user' });
  }
});

// 404 handler for unknown routes.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Generic error handler for unhandled exceptions.
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});



const server = app.listen(PORT, () => {
  console.log(`API Gateway started on port ${PORT}`);
});

module.exports = { app, server };
