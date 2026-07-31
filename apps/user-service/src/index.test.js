// Minimal tests for the User Service app wiring and route registration.
// Confirms health and user CRUD route registration.
const { describe, it } = require('node:test');
const assert = require('node:assert');

// Load the user service express app for route inspection tests.
const { app } = require('./index');

describe('User Service', () => {
  it('should export express app', () => {
    // Confirm the module exposes a valid Express application.
    assert.ok(app);
    // The app should have the listen method available to start the server.
    assert.strictEqual(typeof app.listen, 'function');
  });

  it('should have health endpoints registered', () => {
    // Confirm the service defines health, liveness, and readiness routes.
    const routes = app._router.stack
      .filter((r) => r.route)
      .map((r) => ({ path: r.route.path, methods: Object.keys(r.route.methods) }));

    const healthRoute = routes.find((r) => r.path === '/health');
    assert.ok(healthRoute, 'Should have /health route');

    const liveRoute = routes.find((r) => r.path === '/health/live');
    assert.ok(liveRoute, 'Should have /health/live route');

    const readyRoute = routes.find((r) => r.path === '/health/ready');
    assert.ok(readyRoute, 'Should have /health/ready route');
  });

  it('should have CRUD endpoints for users', () => {
 // Confirm the service registers user CRUD endpoints.
    const routes = app._router.stack
      .filter((r) => r.route)
      .map((r) => ({ path: r.route.path, methods: Object.keys(r.route.methods) }));

    const getUsersRoute = routes.find((r) => r.path === '/users' && r.methods.includes('get'));
    assert.ok(getUsersRoute, 'Should have GET /users route');

    const postUsersRoute = routes.find((r) => r.path === '/users' && r.methods.includes('post'));
    assert.ok(postUsersRoute, 'Should have POST /users route');
  });
});
