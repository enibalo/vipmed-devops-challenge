const express = require('express');
const axios = require('axios');
const process = require("process");

const app = express();
const PORT = process.env.PORT || 3000;
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';


const client = require('prom-client');
const collectDefaultMetrics = client.collectDefaultMetrics;
const register = new client.Registry();
// MAYBE WINSTON IS THE NEW REGISTRY... 
const prefix = 'api_gateway_';
collectDefaultMetrics({ prefix, register });

// TODO: Implement structured JSON logging (e.g., winston, pino)
// All logs should include: timestamp, level, message, and request context

app.use(express.json());


// Middleware to record request durations
app.use((req, res, next) => {
    res.on('finish', () => {
      // use WINSTON TO DO THIS.. 
    });
    next();
});

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


app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(async () => await register.metrics());
});

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
 
const server = app.listen(PORT, () => {
  console.log(`API Gateway started on port ${PORT}`);
});


// Graceful shutdown handler
function shutdown()  {
  console.log("SIGINT/SIGTERM received, shutting down gracefully...");

  // Stop accepting new connections
  server.close(async () => {
    console.log("api-gateway server closed");
    // use await with connection.close() to close downstream services...
    
    // gracefully end the server process 
    process.exit(0)
  });

  // Force shutdown after 10 seconds if it cannot close gracefully
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// handle SIGTERM signal 
process.on("SIGTERM", ()=> shutdown());

// handle SIGINT (Ctrl+C) signal
process.on("SIGINT", () => shutdown());

module.exports = { app, server };
