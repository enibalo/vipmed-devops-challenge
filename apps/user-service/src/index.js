/**
 * User Service API backed by Redis for simple user CRUD operations.
 * Includes health checks, readiness probe, and sample data initialization.
 */
const express = require('express');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

const app = express();
// Configure the listening port for this service.
const PORT = process.env.PORT || 3001;

// Redis client configuration 
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
  lazyConnect: true
});

// Log connection state to help diagnose Redis availability.
redis.on('connect', () => console.log('Connected to Redis'));
redis.on('error', (err) => console.error('Redis error:', err.message));

// Parse incoming JSON payloads for POST requests.
app.use(express.json());

// Health check endpoints for service diagnostics.
app.get('/health', (req, res) => {
  // Return a simple health payload identifying this service.
  res.json({ status: 'healthy', service: 'user-service', timestamp: new Date().toISOString() });
});

app.get('/health/live', (req, res) => {
  // Return a minimal live response for liveness probes.
  res.json({ status: 'alive' });
});

// Ready endpoint verifies Redis dependency.
app.get('/health/ready', async (req, res) => {
  try {
    // Ping Redis to confirm the data store is reachable.
    await redis.ping();
    res.json({ status: 'ready', dependencies: { redis: 'up' } });
  } catch (error) {
    // If Redis is unavailable, report not ready.
    res.status(503).json({
      status: 'not ready',
      dependencies: { redis: 'down' }
    });
  }
});



const USERS_KEY = 'users';

// Create a function to initialize sample data
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
      console.log('Sample data initialized');
    }
  } catch (error) {
    // Continue startup even if sample data initialization fails.
    console.warn('Could not initialize Redis data:', error.message);
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
    console.error('Failed to get users:', error.message);
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
    console.error('Failed to get user:', error.message);
    res.status(500).json({ error: 'Failed to retrieve user' });
  }
});

// Create a new user
app.post('/users', async (req, res) => {
  try {
    const { name, email, role } = req.body;

    // Validate required fields before processing.
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const data = await redis.get(USERS_KEY);
    const users = data ? JSON.parse(data) : [];

    // Check for duplicate email.
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

    // Append the new user and persist the updated list.
    users.push(newUser);
    await redis.set(USERS_KEY, JSON.stringify(users));

    console.log('User created:', newUser.id);
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Failed to create user:', error.message);
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

    console.log('User deleted:', req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete user:', error.message);
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
  // Log the error and return a generic internal server error response.
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});


const start = async () => {
  // Ensure sample data is initialized before the service begins accepting traffic.
  await initializeData();
  const server = app.listen(PORT, () => {
    console.log(`User Service started on port ${PORT}`);
  });
  return server;
};

start();

module.exports = { app };
