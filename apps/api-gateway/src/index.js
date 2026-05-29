const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';

// TODO: Implement structured JSON logging (e.g., winston, pino)
// All logs should include: timestamp, level, message, and request context

app.use(express.json());

// TODO: Add request logging middleware
// Should log: method, path, status code, response time in ms

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'api-gateway', timestamp: new Date().toISOString() });
});

app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

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

// TODO: Add /metrics endpoint for Prometheus
// Hint: Use prom-client library to expose default and custom metrics

// Proxy to User Service
app.get('/api/users', async (req, res) => {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/users`);
    res.json(response.data);
  } catch (error) {
    console.error('Failed to fetch users:', error.message);
    res.status(502).json({ error: 'Failed to fetch users from user-service' });
  }
});

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

app.post('/api/users', async (req, res) => {
  try {
    const response = await axios.post(`${USER_SERVICE_URL}/users`, req.body);
    res.status(201).json(response.data);
  } catch (error) {
    console.error('Failed to create user:', error.message);
    res.status(502).json({ error: 'Failed to create user' });
  }
});

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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// TODO: Implement graceful shutdown
// The process should handle SIGTERM and SIGINT signals to:
// 1. Stop accepting new connections
// 2. Finish processing in-flight requests
// 3. Close connections to downstream services
// 4. Exit cleanly

const server = app.listen(PORT, () => {
  console.log(`API Gateway started on port ${PORT}`);
});

module.exports = { app, server };
