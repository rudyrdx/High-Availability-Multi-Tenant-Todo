import request from 'supertest';
import app from '../../app.js';
import driver from '../../config/neo4j.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

describe('Todo API', () => {
    let tenantId;
    let memberToken;
    let adminToken;
    let memberUserId;
    let adminUserId;

    beforeAll(async () => {
        // Seed invite keys for this test
        const session = driver.session();
        try {
            await session.run(`
                UNWIND ['todo-key', 'other-key'] as key
                MERGE (i:InviteKey {key: key})
                SET i.isUsed = false
            `);
        } finally {
            await session.close();
        }

        // Setup Tenant
        const uniqueSlug = 'todo-test-' + uuidv4();
        const createTenantRes = await request(app)
            .post('/api/tenant/create')
            .send({
                name: 'Todo Test Corp',
                slug: uniqueSlug,
                email: `admin-${uniqueSlug}@todotest.com`,
                fullName: 'Todo Admin',
                password: 'TodoAdmin123!',
                inviteKey: 'todo-key'
            });

        tenantId = createTenantRes.body.tenant.id;
        adminUserId = createTenantRes.body.user.id;

        // Admin Token
        adminToken = jwt.sign(
            { userId: adminUserId, tenantId, role: 'admin' },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1h' }
        );

        // Create Member User
        const createMemberRes = await request(app)
            .post('/api/user/create')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                email: `member-${uniqueSlug}@todotest.com`,
                fullName: 'Todo Member',
                password: 'TodoMember123!',
                role: 'member'
            });

        memberUserId = createMemberRes.body.user.id;

        // Member Token
        memberToken = jwt.sign(
            { userId: memberUserId, tenantId, role: 'member' },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1h' }
        );
    });

    describe('POST /api/todos', () => {
        it('should create a todo for an authenticated member', async () => {
            const res = await request(app)
                .post('/api/todos')
                .set('Authorization', `Bearer ${memberToken}`)
                .send({
                    title: 'Test Todo',
                    description: 'Do something',
                    is_completed: false,
                    priority: 'high'
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.todo.title).toBe('Test Todo');
            expect(res.body.todo.id).toBeDefined();
            expect(res.body.todo.user_id).toBe(memberUserId);
            expect(res.body.todo.tenant_id).toBe(tenantId);
        });

        it('should fail if unauthenticated', async () => {
            const res = await request(app)
                .post('/api/todos')
                .send({
                    title: 'No Auth',
                    is_completed: false,
                    priority: 'low'
                });
            expect(res.status).toBe(401);
        });

        it('should fail if user belongs to another tenant', async () => {
            // Create another tenant
            const otherSlug = 'other-' + uuidv4();
            const otherTenantRes = await request(app)
                .post('/api/tenant/create')
                .send({
                    name: 'Other Corp',
                    slug: otherSlug,
                    email: `admin-${otherSlug}@other.com`,
                    fullName: 'Other Admin',
                    password: 'OtherAdmin123!',
                    inviteKey: 'other-key'
                });

            const otherTenantId = otherTenantRes.body.tenant.id;
            const otherUserId = otherTenantRes.body.user.id;

            // Token for other tenant user
            const otherToken = jwt.sign(
                { userId: otherUserId, tenantId: otherTenantId, role: 'admin' },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '1h' }
            );

            // Try to create using other token but pointing to this tenant? 
            // Wait, the API infers tenant from token. 
            // If I construct a malicious token where tenantId matches target but userId is not in target?

            const forgedToken = jwt.sign(
                { userId: otherUserId, tenantId: tenantId, role: 'member' },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '1h' }
            );

            const res = await request(app)
                .post('/api/todos')
                .set('Authorization', `Bearer ${forgedToken}`)
                .send({
                    title: 'Cross Tenant',
                    is_completed: false,
                    priority: 'low'
                });

            // Should fail because membership check
            expect(res.status).toBe(403);
        });
    });

    describe('GET /api/todos', () => {
        it('should list todos for the user', async () => {
            const res = await request(app)
                .get('/api/todos')
                .set('Authorization', `Bearer ${memberToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.todos)).toBe(true);
            expect(res.body.todos.length).toBeGreaterThanOrEqual(1);
            expect(res.body.todos[0].title).toBe('Test Todo');
        });
    });

    describe('PUT /api/todos/:id', () => {
        let todoId;
        beforeAll(async () => {
            // Create one to update
            const res = await request(app)
                .post('/api/todos')
                .set('Authorization', `Bearer ${memberToken}`)
                .send({
                    title: 'Update Me',
                    is_completed: false,
                    priority: 'low'
                });
            todoId = res.body.todo.id;
        });

        it('should update todo details', async () => {
            const res = await request(app)
                .put(`/api/todos/${todoId}`)
                .set('Authorization', `Bearer ${memberToken}`)
                .send({
                    title: 'Updated Title',
                    is_completed: true
                });

            expect(res.status).toBe(200);
            expect(res.body.todo.title).toBe('Updated Title');
            expect(res.body.todo.is_completed).toBe(true);
            expect(res.body.todo.completed_at).toBeDefined();
        });
    });

    describe('DELETE /api/todos/:id', () => {
        let todoId;
        beforeAll(async () => {
            const res = await request(app)
                .post('/api/todos')
                .set('Authorization', `Bearer ${memberToken}`)
                .send({
                    title: 'Delete Me',
                    is_completed: false,
                    priority: 'low'
                });
            todoId = res.body.todo.id;
        });

        it('should fail for member', async () => {
            const res = await request(app)
                .delete(`/api/todos/${todoId}`)
                .set('Authorization', `Bearer ${memberToken}`);

            expect(res.status).toBe(403);
        });

        it('should succeed for admin', async () => {
            const res = await request(app)
                .delete(`/api/todos/${todoId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            // Verify deletion
            const getRes = await request(app)
                .get(`/api/todos/${todoId}`)
                .set('Authorization', `Bearer ${memberToken}`); // Member tries to fetch

            expect(getRes.status).toBe(404);
        });
    });
});
