const { describe, it } = require('node:test');
const assert = require('node:assert');

const { app } = require('./index');

describe('User Service', () => {
  it('should export express app', () => {
    assert.ok(app);
    assert.strictEqual(typeof app.listen, 'function');
  });

  it('should have health endpoints registered', () => {
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
    const routes = app._router.stack
      .filter((r) => r.route)
      .map((r) => ({ path: r.route.path, methods: Object.keys(r.route.methods) }));

    const getUsersRoute = routes.find((r) => r.path === '/users' && r.methods.includes('get'));
    assert.ok(getUsersRoute, 'Should have GET /users route');

    const postUsersRoute = routes.find((r) => r.path === '/users' && r.methods.includes('post'));
    assert.ok(postUsersRoute, 'Should have POST /users route');
  });
});
