const express = require('express');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// TODO: Implement structured JSON logging (e.g., winston, pino)
// All logs should include: timestamp, level, message, and relevant context

// Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
  lazyConnect: true
});

redis.on('connect', () => console.log('Connected to Redis'));
redis.on('error', (err) => console.error('Redis error:', err.message));

app.use(express.json());

// TODO: Add request logging middleware

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

// TODO: Add /metrics endpoint for Prometheus

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
      console.log('Sample data initialized');
    }
  } catch (error) {
    console.warn('Could not initialize Redis data:', error.message);
  }
};

// Get all users
app.get('/users', async (req, res) => {
  try {
    const data = await redis.get(USERS_KEY);
    const users = data ? JSON.parse(data) : [];
    res.json({ data: users, total: users.length });
  } catch (error) {
    console.error('Failed to get users:', error.message);
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
    console.error('Failed to get user:', error.message);
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

    console.log('User created:', newUser.id);
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Failed to create user:', error.message);
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

    console.log('User deleted:', req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete user:', error.message);
    res.status(500).json({ error: 'Failed to delete user' });
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
// Handle SIGTERM/SIGINT: close server, disconnect Redis, exit cleanly

const start = async () => {
  await initializeData();
  const server = app.listen(PORT, () => {
    console.log(`User Service started on port ${PORT}`);
  });
  return server;
};

start();

module.exports = { app };
