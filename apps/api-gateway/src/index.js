/**
 * API Gateway service that forwards user-related requests to the user service.
 * Includes health, readiness, and proxy endpoints for user CRUD operations.
 */
const express = require('express');
const axios = require('axios');
const process = require("process");

const app = express();
// Configure the local listening port and downstream user service address.
const PORT = process.env.PORT || 3000;
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const ENVIRONMENT = process.env.NODE_ENV || "production"

const client = require('prom-client');

const collectDefaultMetrics = client.collectDefaultMetrics;
const register = new client.Registry();
const prefix = 'api_gateway_';
collectDefaultMetrics({ prefix, register });

const winston = require("winston");

const logger = winston.createLogger({
  transports: [
    // configure winston to print to the console in JSON format in production and single-line format in dev 
    new winston.transports.Console( {
      format: ENVIRONMENT === "production"
      ? winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        )
      : winston.format.simple()})
  ]
});


app.use(express.json());


// Create a histogram metric for tracking request durations in miliseconds 
const httpRequestDurationMiliseconds = new client.Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in miliseconds',
    labelNames: ['method', 'route', 'status_code'],
    //configure buckets so they capture values in the miliseconds 1ms, 5ms e.t.c 
    buckets: [0.001, 0.005, 0.010, 0.025, 0.050, 0.100, 0.250, 0.500, 1, 2, 5],
    registers: [register],
});

// Middleware to record request durations
// All logs should include: timestamp, level, message, and request context
app.use((req, res, next) => {
      const end = httpRequestDurationMiliseconds.startTimer();
      res.on('finish', () => {
        end({ method: req.method, route: req.route ? req.route.path : req.path, status_code: res.statusCode });
        logger.http("HTTP Request", {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
      });
    });
    next();
});

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
    logger.error('Failed to connect to user-service: ' + error.message);
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

// Proxy to User Service: list users.
app.get('/api/users', async (req, res) => {
  try {
    // Forward the request to the user service and return its response body.
    const response = await axios.get(`${USER_SERVICE_URL}/users`);
    // Relay the downstream list of users unchanged.
    res.json(response.data);
  } catch (error) {
    logger.error('Failed to fetch users: ' + error.message);
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
    logger.error('Failed to fetch user: ' + error.message);
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
    logger.error('Failed to create user: ' + error.message);
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
    logger.error('Failed to delete user: ' + error.message);
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
  logger.error('Unhandled error: ' + err.message);
  res.status(500).json({ error: 'Internal server error' });
});
 
const server = app.listen(PORT, () => {
  logger.info(`API Gateway started on port ${PORT}`);
});


// Graceful shutdown handler
function shutdown()  {
  logger.info("SIGINT/SIGTERM received, shutting down gracefully...");

  // Stop accepting new connections
  server.close(async () => {
    logger.info("api-gateway server closed");
    // use await with connection.close() to close downstream services...
    
    // gracefully end the server process 
    process.exit(0)
  });

  // Force shutdown after 10 seconds if it cannot close gracefully
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// handle SIGTERM signal 
process.on("SIGTERM", ()=> shutdown());

// handle SIGINT (Ctrl+C) signal
process.on("SIGINT", () => shutdown());

module.exports = { app, server };
