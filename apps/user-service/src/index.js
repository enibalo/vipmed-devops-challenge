const express = require('express');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const process = require("process");

const app = express();
const PORT = process.env.PORT || 3001;
const TEST = process.env.TEST 

const client = require('prom-client');

const collectDefaultMetrics = client.collectDefaultMetrics;
const register = new client.Registry();
const prefix = 'api_gateway_';
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

// Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  username: process.env.REDIS_USERNAME, 
  password: process.env.REDIS_PASSWORD,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
  lazyConnect: true
});

redis.on('connect', () => logger.info('Connected to Redis'));
redis.on('error', (err) => logger.error('Redis error:', err.message));

app.use(express.json());

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

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'user-service', timestamp: new Date().toISOString() });
});

app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', async (req, res) => {
  try {
    await redis.ping();
    res.json({ status: 'ready', dependencies: { redis: 'up' } });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      dependencies: { redis: 'down' }
    });
  }
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(async () => await register.metrics());
});

const USERS_KEY = 'users';

// Initialize sample data
const initializeData = async () => {
  try {
    await redis.connect();
    const exists = await redis.exists(USERS_KEY);
    if (!exists) {
      const sampleUsers = [
        { id: uuidv4(), name: 'John Doe', email: 'john@example.com', role: 'admin', createdAt: new Date().toISOString() },
        { id: uuidv4(), name: 'Jane Smith', email: 'jane@example.com', role: 'user', createdAt: new Date().toISOString() },
        { id: uuidv4(), name: 'Bob Wilson', email: 'bob@example.com', role: 'user', createdAt: new Date().toISOString() }
      ];
      await redis.set(USERS_KEY, JSON.stringify(sampleUsers));
      logger.info('Sample data initialized');
    }
  } catch (error) {
    logger.warn('Could not initialize Redis data:', error.message);
  }
};

// Get all users
app.get('/users', async (req, res) => {
  try {
    const data = await redis.get(USERS_KEY);
    const users = data ? JSON.parse(data) : [];
    res.json({ data: users, total: users.length });
  } catch (error) {
    logger.error('Failed to get users:', error.message);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// Get user by ID
app.get('/users/:id', async (req, res) => {
  try {
    const data = await redis.get(USERS_KEY);
    const users = data ? JSON.parse(data) : [];
    const user = users.find(u => u.id === req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Failed to get user:', error.message);
    res.status(500).json({ error: 'Failed to retrieve user' });
  }
});

// Create user
app.post('/users', async (req, res) => {
  try {
    const { name, email, role } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const data = await redis.get(USERS_KEY);
    const users = data ? JSON.parse(data) : [];

    // Check for duplicate email
    if (users.find(u => u.email === email)) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const newUser = {
      id: uuidv4(),
      name,
      email,
      role: role || 'user',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    await redis.set(USERS_KEY, JSON.stringify(users));

    logger.info('User created:', newUser.id);
    res.status(201).json(newUser);
  } catch (error) {
    logger.error('Failed to create user:', error.message);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Delete user
app.delete('/users/:id', async (req, res) => {
  try {
    const data = await redis.get(USERS_KEY);
    const users = data ? JSON.parse(data) : [];
    const index = users.findIndex(u => u.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    users.splice(index, 1);
    await redis.set(USERS_KEY, JSON.stringify(users));

    logger.info('User deleted:', req.params.id);
    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete user:', error.message);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});


// Graceful shutdown handler
function shutdownServer(server)  {
  logger.info("SIGINT/SIGTERM received, shutting down gracefully...");

  // Stop accepting new connections
  server.close(async () => {
    logger.info("user-service server closed");
    // TODO: use await with connection.close() to close downstream services...
    
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
