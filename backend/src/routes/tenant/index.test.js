// routes/tenant/index.test.js
import request from 'supertest';
import app from '../../app.js';
import driver from '../../config/neo4j.js';

// Note: driver.close() handled by globalTeardown.js

describe('POST /api/tenant/create', () => {

  beforeAll(async () => {
    // Create invite keys needed for these tests
    const session = driver.session();
    try {
      const inviteKeys = ['chronos-beta', 'test-key-1', 'test-key-2', 'test-key-3'];
      for (const key of inviteKeys) {
        await session.run(`
          MERGE (i:InviteKey {key: $key})
          ON CREATE SET i.isUsed = false
          ON MATCH SET i.isUsed = false
        `, { key });
      }
    } finally {
      await session.close();
    }
  });

  it('should create tenant and admin user with valid invite key', async () => {
    const res = await request(app)
      .post('/api/tenant/create')
      .send({
        name: 'Test Corp',
        slug: 'testcorp',
        email: 'admin@testcorp.com',
        fullName: 'Admin User',
        password: 'TestPass123!',
        inviteKey: 'chronos-beta'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.tenant.slug).toBe('testcorp');
    expect(res.body.user.email).toBe('admin@testcorp.com');
    expect(res.body.user.role).toBe('admin');
  });


  it.skip('should create relationships between InviteKey, Tenant, and User', async () => {
    const res = await request(app)
      .post('/api/tenant/create')
      .send({
        name: 'Relationship Test Corp',
        slug: 'reltest',
        email: 'admin@reltest.com',
        fullName: 'Relationship Admin',
        password: 'RelTest123!',
        inviteKey: 'test-key-1'
      });

    expect(res.status).toBe(201);

    // Verify relationships exist in Neo4j
    const session = driver.session();
    try {
      const result = await session.run(`
        MATCH (i:InviteKey {key: $inviteKey})-[:INVITED]->(u:User {email: $email})
        MATCH (i)-[:INVITED_TENANT]->(t:Tenant {slug: $slug})
        MATCH (t)-[:HAS_USER]->(u)
        RETURN i, u, t
      `, { inviteKey: 'test-key-1', email: 'admin@reltest.com', slug: 'reltest' });

      expect(result.records.length).toBe(1);

      const inviteKey = result.records[0].get('i').properties;
      const user = result.records[0].get('u').properties;
      const tenant = result.records[0].get('t').properties;

      expect(inviteKey.isUsed).toBe(true);
      expect(user.email).toBe('admin@reltest.com');
      expect(tenant.slug).toBe('reltest');
    } finally {
      await session.close();
    }
  });

  it('should reject invalid invite key', async () => {
    const res = await request(app)
      .post('/api/tenant/create')
      .send({
        name: 'Test Corp',
        slug: 'testcorp2',
        email: 'admin@testcorp2.com',
        fullName: 'Admin User',
        password: 'TestPass123!',
        inviteKey: 'invalid-key'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid or already used invite key');
  });

  it('should reject already used invite key', async () => {
    // First use
    await request(app)
      .post('/api/tenant/create')
      .send({
        name: 'First Corp',
        slug: 'firstcorp',
        email: 'admin@firstcorp.com',
        fullName: 'First Admin',
        password: 'FirstPass123!',
        inviteKey: 'chronos-beta'
      });

    // Second use (should fail)
    const res = await request(app)
      .post('/api/tenant/create')
      .send({
        name: 'Second Corp',
        slug: 'secondcorp',
        email: 'admin@secondcorp.com',
        fullName: 'Second Admin',
        password: 'SecondPass123!',
        inviteKey: 'chronos-beta'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid or already used invite key');
  });

  it('should reject duplicate slug', async () => {
    const res = await request(app)
      .post('/api/tenant/create')
      .send({
        name: 'Testcorp Duplicate',
        slug: 'testcorp', // Already exists from first test
        email: 'new@testcorp.com',
        fullName: 'New Admin',
        password: 'NewPass123!',
        inviteKey: 'test-key-1'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Tenant slug or email already exists');
  });

  it('should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/tenant/create')
      .send({
        name: 'New Corp',
        slug: 'newcorp',
        email: 'admin@testcorp.com', // Already exists from first test
        fullName: 'Duplicate User',
        password: 'DupPass123!',
        inviteKey: 'test-key-2'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Tenant slug or email already exists');
  });

  it('should validate required fields', async () => {
    const res = await request(app)
      .post('/api/tenant/create')
      .send({
        name: 'Test',
        slug: 'test'
        // Missing email, fullName, inviteKey
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('should validate email format', async () => {
    const res = await request(app)
      .post('/api/tenant/create')
      .send({
        name: 'Test',
        slug: 'test',
        email: 'invalid-email',
        fullName: 'Test User',
        password: 'TestPass123!',
        inviteKey: 'chronos-beta'
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('should validate slug format (lowercase alphanumeric with hyphens)', async () => {
    const res = await request(app)
      .post('/api/tenant/create')
      .send({
        name: 'Test',
        slug: 'Test_Invalid!',
        email: 'test@test.com',
        fullName: 'Test User',
        password: 'TestPass123!',
        inviteKey: 'chronos-beta'
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
});

describe('POST /api/tenant/lookup', () => {

  beforeAll(async () => {
    // Create a tenant for lookup tests
    const session = driver.session();
    try {
      // Ensure invite key exists
      await session.run(`
        MERGE (i:InviteKey {key: 'lookup-test-key'})
        ON CREATE SET i.isUsed = false
      `);

      // Create acme tenant if it doesn't exist
      await session.run(`
        MERGE (t:Tenant {slug: 'acme'})
        ON CREATE SET t.id = randomUUID(), t.name = 'Acme Corp', t.isActive = true
        ON MATCH SET t.isActive = true
      `);
    } finally {
      await session.close();
    }
  });

  it('should return tenant when valid name provided', async () => {
    const res = await request(app)
      .post('/api/tenant/lookup')
      .send({ tenantName: 'acme' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tenantId).toBeDefined();
    expect(res.body.redirectTo).toContain('/login');
  });

  it('should return 404 when tenant not found', async () => {
    const res = await request(app)
      .post('/api/tenant/lookup')
      .send({ tenantName: 'nonexistent' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Tenant not found');
  });

  it('should return 400 when tenantName is missing', async () => {
    const res = await request(app)
      .post('/api/tenant/lookup')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it('should return 400 when tenantName is empty', async () => {
    const res = await request(app)
      .post('/api/tenant/lookup')
      .send({ tenantName: '' });

    expect(res.status).toBe(400);
  });

});

