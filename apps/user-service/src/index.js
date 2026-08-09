/**
 * User Service API backed by Redis for simple user CRUD operations.
 * Includes health checks, readiness probe, and sample data initialization.
 */
const express = require('express');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const process = require("process");

const app = express();
// Configure the listening port for this service.
const PORT = process.env.PORT || 3001;
const TEST = process.env.TEST 

// Create the Prometheus client for collecting metrics.
const client = require('prom-client');

const collectDefaultMetrics = client.collectDefaultMetrics;
const register = new client.Registry();

// prefix logged metrics to help identify the source service in a multi-service setup
const prefix = 'user_service_';
collectDefaultMetrics({ prefix, register });

// Create a histogram metric for tracking request durations in miliseconds 
const httpRequestDurationMiliseconds = new client.Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in miliseconds',
    labelNames: ['method', 'route', 'status_code'],
    //configure buckets so they capture values in the miliseconds 1ms, 5ms e.t.c 
    buckets: [0.001, 0.005, 0.010, 0.025, 0.050, 0.100, 0.250, 0.500, 1, 2, 5],
    registers: [register],
});

// Create a logger using winston for structured logging of HTTP requests and errors.
const winston = require("winston");

const logger = winston.createLogger({
  transports: [
    // configure winston to print to the console in JSON format in production and single-line format in dev 
    new winston.transports.Console( {
      format: process.env.NODE_ENV === "production"
      ? winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        )
      : winston.format.simple()})
  ]
});

// configure the redis client 
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  username: process.env.REDIS_USERNAME, 
  password: process.env.REDIS_PASSWORD,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
  lazyConnect: true
});

// Log Redis events using the winston logger for observability
redis.on('connect', () => logger.info('Connected to Redis'));
redis.on('error', (err) => logger.error('Redis error: ' + err.message));

// Middleware to parse incoming JSON payloads
app.use(express.json());

// Middleware to record request durations, timestamp, level, message, and request context
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

// Health check endpoint for container orcehstration 
app.get('/health', (req, res) => {
  // Return a simple health payload identifying this service.
  res.json({ status: 'healthy', service: 'user-service', timestamp: new Date().toISOString() });
});

// Liveliness check endpoint for container orcehstration.
app.get('/health/live', (req, res) => {
  // Return a minimal live response for liveness probes.
  res.json({ status: 'alive' });
});

// Readiness check endpoint to ensure that dependencies are available before routing traffic to the service. 
app.get('/health/ready', async (req, res) => {
  try {
    // Ping Redis to confirm the data store is reachable.
    await redis.ping();
    res.json({ status: 'ready', dependencies: { redis: 'up' } });
  } catch (error) {
    // If Redis is down or unreachable, return a not ready status.
    logger.error('Failed to connect to redis: ' + error.message);
    res.status(503).json({
      status: 'not ready',
      dependencies: { redis: 'down' }
    });
  }
});

// Expose Prometheus metrics for scraping. 
app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(async () => await register.metrics());
});

const USERS_KEY = 'users';

// Initialize sample data in Redis if no users exist yet.
// - Connects to Redis and seeds a small set of example users for local/dev usage.
const initializeData = async () => {
  try {
    // Connect to Redis before reading or writing data.
    await redis.connect();
    const exists = await redis.exists(USERS_KEY);
    if (!exists) {
      // Seed sample users only if no user data exists yet.
      const sampleUsers = [
        { id: uuidv4(), name: 'John Doe', email: 'john@example.com', role: 'admin', createdAt: new Date().toISOString() },
        { id: uuidv4(), name: 'Jane Smith', email: 'jane@example.com', role: 'user', createdAt: new Date().toISOString() },
        { id: uuidv4(), name: 'Bob Wilson', email: 'bob@example.com', role: 'user', createdAt: new Date().toISOString() }
      ];
      await redis.set(USERS_KEY, JSON.stringify(sampleUsers));
      logger.info('Sample data initialized');
    }
  } catch (error) {
    // Log a warning if Redis is unreachable or data initialization fails, but allow the service to continue running.
    logger.warn('Could not initialize Redis data: ' + error.message);
  }
};

// Get all users
app.get('/users', async (req, res) => {
  try {
    // Get all users from Redis and parse it from JSON.
    const data = await redis.get(USERS_KEY);
    const users = data ? JSON.parse(data) : [];
    // Return the full user list and a total count.
    res.json({ data: users, total: users.length });
  } catch (error) {
    // Log the error and return an error status code to the client.
    logger.error('Failed to get users: ' + error.message);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// Get a single user by ID.
app.get('/users/:id', async (req, res) => {
  try {
    // Load the current user list
    const data = await redis.get(USERS_KEY);
    const users = data ? JSON.parse(data) : [];
    // Find the user with the requested ID.
    const user = users.find(u => u.id === req.params.id);

    if (!user) {
      // Return 404 when the requested user is not found.
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    // Log the error and return an error status code to the client.
    logger.error('Failed to get user: ' + error.message);
    res.status(500).json({ error: 'Failed to retrieve user' });
  }
});

// Create a new user
app.post('/users', async (req, res) => {
  try {
    // parse the incoming request body for required fields
    const { name, email, role } = req.body;

    // Validate required fields before processing.
    if (!name || !email) {
      // Return a bad/invalid request status code if required fields are missing.
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // get the current list of users from Redis
    const data = await redis.get(USERS_KEY);
    const users = data ? JSON.parse(data) : [];

    // Check for users with the same email to prevent duplicates and return a conflict status code if found.
    if (users.find(u => u.email === email)) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // create a new user object to send back to the client and persist in Redis
    const newUser = {
      id: uuidv4(),
      name,
      email,
      role: role || 'user',
      createdAt: new Date().toISOString()
    };

    // Append the new user and persist the updated list.
    users.push(newUser);
    await redis.set(USERS_KEY, JSON.stringify(users));

    logger.info('User created: ' + newUser.id);

    // Return the newly created user with a 201 Created status code.
    res.status(201).json(newUser);
  } catch (error) {
    // Log the error and return an error status code to the client.
    logger.error('Failed to create user: ' + error.message);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Delete an existing user by ID.
app.delete('/users/:id', async (req, res) => {
  try {
    // Load the current users and find the one to delete.
    const data = await redis.get(USERS_KEY);
    const users = data ? JSON.parse(data) : [];
    const index = users.findIndex(u => u.id === req.params.id);

    if (index === -1) {
      // Return 404 when the target user does not exist.
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove the user and persist the updated list.
    users.splice(index, 1);
    await redis.set(USERS_KEY, JSON.stringify(users));

    logger.info('User deleted: ' +  req.params.id);
    res.status(204).send();
  } catch (error) {
    // Log the error and return an error status code to the client.
    logger.error('Failed to delete user: ' + error.message);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// 404 handler for unmatched API routes.
app.use((req, res) => {
  // Return a consistent not found response for any unsupported path.
  res.status(404).json({ error: 'Not found' });
});

// Generic error handler for unexpected failures.
app.use((err, req, res, next) => {
  logger.error('Unhandled error: ' + err.message);
  res.status(500).json({ error: 'Internal server error' });
});


// Graceful shutdown handler
function shutdownServer(server)  {
  logger.info("SIGINT/SIGTERM received, shutting down gracefully...");

  // Stop accepting new connections
  server.close(async () => {
    logger.info("user-service server closed");
    
    // Close Redis connection
    await redis.quit();
    logger.info('redis connection closed');

    // gracefully end the server process 
    process.exit(0)
  });

  // Force shutdown after 10 seconds if it cannot close gracefully
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Function that handles set up and clean up and runs the server 
const main = async () => {
  // Initialize data 
  await initializeData();

  //Start server 
  var server = app.listen(PORT, () => {
    logger.info(`User Service started on port ${PORT}`);
  });

    // handle SIGTERM signal 
  process.on("SIGTERM", ()=> shutdownServer(server));

  // handle SIGINT (Ctrl+C) signal
  process.on("SIGINT", () => shutdownServer(server));

};

// Start the server if this program isn't being called for testing purposes 
if (TEST != "true"){
  main();
}

module.exports = { app, main };
