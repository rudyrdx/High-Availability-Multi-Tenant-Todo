// routes/user/index.test.js
import request from 'supertest';
import app from '../../app.js';
import driver from '../../config/neo4j.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '../../service/password.service.js';

// Note: driver.close() handled by globalTeardown.js

describe('POST /api/user/create', () => {
  let adminToken;
  let tenantId;

  beforeAll(async () => {
    // Try to get admin user and tenant from seed
    const session = driver.session();
    try {
      const result = await session.run(`
        MATCH (t:Tenant {slug: 'acme'})-[:HAS_USER]->(u:User {email: 'john@acme.com'})
        RETURN t.id AS tenantId, u.id AS userId, u.role AS role
      `);
      if (result.records.length > 0) {
        tenantId = result.records[0].get('tenantId');
        const userId = result.records[0].get('userId');
        adminToken = jwt.sign(
          { userId, tenantId, role: 'admin' },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '1h' }
        );
      } else {
        // If not present, create via API
        const slug = 'acme';
        const res = await request(app)
          .post('/api/tenant/create')
          .send({
            name: 'acme',
            slug,
            email: 'john@acme.com',
            fullName: 'John Doe',
            password: 'password123',
            inviteKey: 'chronos-beta'
          });
        tenantId = res.body.tenant.id;
        const userId = res.body.user.id;
        adminToken = jwt.sign(
          { userId, tenantId, role: 'admin' },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '1h' }
        );
      }
    } finally {
      await session.close();
    }
  });

  it('should create a new user when authenticated as admin', async () => {
    const res = await request(app)
      .post('/api/user/create')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'jane@acme.com',
        fullName: 'Jane Doe',
        password: 'JanePass123!',
        role: 'member'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('jane@acme.com');
    expect(res.body.user.role).toBe('member');
    expect(res.body.user.tenant_id).toBe(tenantId);
  });

  it('should create relationships between Tenant and User', async () => {
    const res = await request(app)
      .post('/api/user/create')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'bob@acme.com',
        fullName: 'Bob Smith',
        password: 'BobPass123!',
        role: 'member'
      });

    expect(res.status).toBe(201);

    // Verify relationship exists
    const session = driver.session();
    try {
      const result = await session.run(`
        MATCH (t:Tenant {id: $tenantId})-[:HAS_USER]->(u:User {email: $email})
        RETURN t, u
      `, { tenantId, email: 'bob@acme.com' });

      expect(result.records.length).toBe(1);

      const user = result.records[0].get('u').properties;
      expect(user.email).toBe('bob@acme.com');
      expect(user.full_name).toBe('Bob Smith');
      expect(user.role).toBe('member');
    } finally {
      await session.close();
    }
  });

  it('should reject user creation without authentication', async () => {
    const res = await request(app)
      .post('/api/user/create')
      .send({
        email: 'noauth@acme.com',
        fullName: 'No Auth',
        password: 'NoAuth123!',
        role: 'member'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/token|authentication|unauthorized/i);
  });

  it('should reject user creation when authenticated as non-admin', async () => {
    // Create a member token
    const memberToken = jwt.sign(
      { userId: 'member-id', tenantId, role: 'member' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .post('/api/user/create')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        email: 'unauthorized@acme.com',
        fullName: 'Unauthorized User',
        password: 'Unauth123!',
        role: 'member'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/permission|forbidden|admin/i);
  });

  it('should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/user/create')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'john@acme.com', // Already exists from seed
        fullName: 'Duplicate User',
        password: 'DupPass123!',
        role: 'member'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/email.*exists|duplicate/i);
  });

  it('should validate required fields', async () => {
    const res = await request(app)
      .post('/api/user/create')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'test@acme.com'
        // Missing fullName, role
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('should validate email format', async () => {
    const res = await request(app)
      .post('/api/user/create')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'invalid-email',
        fullName: 'Test User',
        password: 'TestPass123!',
        role: 'member'
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('should validate role is either admin or member', async () => {
    const res = await request(app)
      .post('/api/user/create')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'test@acme.com',
        fullName: 'Test User',
        password: 'TestPass123!',
        role: 'superadmin' // Invalid role
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('should only allow creating users within same tenant', async () => {
    // Use a unique slug for new tenant
    const uniqueSlug = 'othercorp-' + uuidv4();
    const createRes = await request(app)
      .post('/api/tenant/create')
      .send({
        name: 'Other Corp',
        slug: uniqueSlug,
        email: `admin+${uniqueSlug}@othercorp.com`,
        fullName: 'Other Admin',
        password: 'OtherPass123!',
        inviteKey: 'test-key-2'
      });
    if (!createRes.body.tenant || !createRes.body.user) {
      console.error('Tenant creation failed:', createRes.body);
      throw new Error('Tenant creation failed, cannot continue test');
    }
    const otherTenantId = createRes.body.tenant.id;
    const otherAdminToken = jwt.sign(
      { userId: createRes.body.user.id, tenantId: otherTenantId, role: 'admin' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    // Try to create user in original tenant using other tenant's admin token
    const res = await request(app)
      .post('/api/user/create')
      .set('Authorization', `Bearer ${otherAdminToken}`)
      .send({
        email: 'crosstenanttest@acme.com',
        fullName: 'Cross Tenant Test',
        password: 'CrossTest123!',
        role: 'member'
      });

    if (res.status !== 201) {
      console.error('User creation failed:', res.body);
    }
    expect(res.status).toBe(201);

    const session = driver.session();
    try {
      const result = await session.run(`
        MATCH (u:User {email: 'crosstenanttest@acme.com'})
        RETURN u.tenant_id AS tenantId
      `);

      // User should belong to othercorp tenant
      expect(result.records[0].get('tenantId')).toBe(otherTenantId);
      expect(result.records[0].get('tenantId')).not.toBe(tenantId);
    } finally {
      await session.close();
    }
  });
});

describe('POST /api/user/login', () => {
  let tenantId;
  beforeAll(async () => {
    // Always upsert login test user with known password
    const session = driver.session();
    try {
      const result = await session.run(`
        MATCH (t:Tenant {slug: 'acme'}) RETURN t.id AS tenantId
      `);
      tenantId = result.records[0]?.get('tenantId');

      // Hash the test password
      const hashedPassword = await hashPassword('password123');

      await session.run(`
        MATCH (t:Tenant {id: $tenantId})
        MERGE (u:User {email: 'logintest@acme.com'})
        SET u.id = coalesce(u.id, randomUUID()),
            u.tenant_id = t.id,
            u.username = 'logintest',
            u.full_name = 'Login Test',
            u.role = 'member',
            u.created_at = coalesce(u.created_at, datetime().epochMillis),
            u.password = $password
        MERGE (t)-[:HAS_USER]->(u)
      `, { tenantId, password: hashedPassword });
    } finally {
      await session.close();
    }
  });

  it('should login successfully with valid credentials', async () => {
    const res = await request(app)
      .post('/api/user/login')
      .send({
        tenantId,
        email: 'logintest@acme.com',
        password: 'password123'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('logintest@acme.com');
    expect(res.body.user.role).toBe('member');

    // Verify token is valid JWT
    const decoded = jwt.verify(
      res.body.token,
      process.env.JWT_SECRET || 'your-secret-key'
    );
    expect(decoded.userId).toBeDefined();
    expect(decoded.tenantId).toBeDefined();
    expect(decoded.role).toBe('member');
  });

  it('should return 401 with invalid password', async () => {
    const res = await request(app)
      .post('/api/user/login')
      .send({
        tenantId,
        email: 'logintest@acme.com',
        password: 'wrongpassword'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid.*credentials|password/i);
  });

  it('should return 404 with non-existent email', async () => {
    const res = await request(app)
      .post('/api/user/login')
      .send({
        tenantId,
        email: 'nonexistent@acme.com',
        password: 'password123'
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/user.*not found/i);
  });

  it('should validate required fields', async () => {
    const res = await request(app)
      .post('/api/user/login')
      .send({
        email: 'test@acme.com'
        // Missing tenantId, password
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('should validate email format', async () => {
    const res = await request(app)
      .post('/api/user/login')
      .send({
        tenantId,
        email: 'invalid-email',
        password: 'password123'
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('should reject login for user from different tenant', async () => {
    // Create user in a different tenant
    const loginTestSlug = 'logintest-' + uuidv4();
    const createRes = await request(app)
      .post('/api/tenant/create')
      .send({
        name: 'Login Test Corp',
        slug: loginTestSlug,
        email: `admin+${loginTestSlug}@logintest.com`,
        fullName: 'Login Admin',
        password: 'LoginTest123!',
        inviteKey: 'test-key-3'
      });

    if (!createRes.body.tenant) {
      console.error('Tenant creation failed:', createRes.body);
      throw new Error('Tenant creation failed, cannot continue test');
    }
    const wrongTenantId = createRes.body.tenant.id;

    // Try to login with acme user but different tenant ID
    const session = driver.session();
    let acmeTenantId;
    try {
      const result = await session.run(`
        MATCH (t:Tenant {slug: 'acme'})
        RETURN t.id AS tenantId
      `);
      acmeTenantId = result.records[0].get('tenantId');
    } finally {
      await session.close();
    }

    const res = await request(app)
      .post('/api/user/login')
      .send({
        tenantId: wrongTenantId,
        email: 'logintest@acme.com', // This user belongs to acme tenant
        password: 'password123'
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/user.*not found/i);
  });

  it('should include user details in response without password', async () => {
    const res = await request(app)
      .post('/api/user/login')
      .send({
        tenantId,
        email: 'logintest@acme.com',
        password: 'password123'
      });

    expect(res.status).toBe(200);
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.user.email).toBeDefined();
    expect(res.body.user.full_name).toBeDefined();
    expect(res.body.user.role).toBeDefined();
  });
});
