import request from 'supertest';
import app from '../../app.js';
import driver from '../../config/neo4j.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

describe('Category API', () => {
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
                UNWIND ['category-key'] as key
                MERGE (i:InviteKey {key: key})
                SET i.isUsed = false
            `);
        } finally {
            await session.close();
        }

        // Setup Tenant
        const uniqueSlug = 'category-test-' + uuidv4();
        const createTenantRes = await request(app)
            .post('/api/tenant/create')
            .send({
                name: 'Category Test Corp',
                slug: uniqueSlug,
                email: `admin-${uniqueSlug}@categorytest.com`,
                fullName: 'Category Admin',
                password: 'CategoryAdmin123!',
                inviteKey: 'category-key'
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
                email: `member-${uniqueSlug}@categorytest.com`,
                fullName: 'Category Member',
                password: 'CategoryMember123!',
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

    describe('POST /api/categories', () => {
        it('should create a category for an authenticated user', async () => {
            const res = await request(app)
                .post('/api/categories')
                .set('Authorization', `Bearer ${memberToken}`)
                .send({
                    name: 'Work',
                    color: '#3B82F6',
                    icon: 'briefcase'
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.category.name).toBe('Work');
            expect(res.body.category.color).toBe('#3B82F6');
            expect(res.body.category.icon).toBe('briefcase');
            expect(res.body.category.id).toBeDefined();
            expect(res.body.category.user_id).toBe(memberUserId);
            expect(res.body.category.tenant_id).toBe(tenantId);
        });

        it('should create a category without icon', async () => {
            const res = await request(app)
                .post('/api/categories')
                .set('Authorization', `Bearer ${memberToken}`)
                .send({
                    name: 'Personal',
                    color: '#10B981'
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.category.name).toBe('Personal');
            expect(res.body.category.color).toBe('#10B981');
        });

        it('should fail if unauthenticated', async () => {
            const res = await request(app)
                .post('/api/categories')
                .send({
                    name: 'No Auth',
                    color: '#FF0000'
                });
            expect(res.status).toBe(401);
        });

        it('should validate color format', async () => {
            const res = await request(app)
                .post('/api/categories')
                .set('Authorization', `Bearer ${memberToken}`)
                .send({
                    name: 'Invalid Color',
                    color: 'red' // Invalid hex format
                });
            expect(res.status).toBe(400);
            expect(res.body.errors).toBeDefined();
        });

        it('should validate required fields', async () => {
            const res = await request(app)
                .post('/api/categories')
                .set('Authorization', `Bearer ${memberToken}`)
                .send({
                    name: 'Missing Color'
                    // Missing color field
                });
            expect(res.status).toBe(400);
            expect(res.body.errors).toBeDefined();
        });
    });

    describe('GET /api/categories', () => {
        it('should list categories for the user', async () => {
            const res = await request(app)
                .get('/api/categories')
                .set('Authorization', `Bearer ${memberToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.categories)).toBe(true);
            expect(res.body.categories.length).toBeGreaterThanOrEqual(2);
        });

        it('should fail if unauthenticated', async () => {
            const res = await request(app)
                .get('/api/categories');

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/categories/:id', () => {
        let categoryId;

        beforeAll(async () => {
            const res = await request(app)
                .post('/api/categories')
                .set('Authorization', `Bearer ${memberToken}`)
                .send({
                    name: 'Get Test',
                    color: '#F59E0B'
                });
            categoryId = res.body.category.id;
        });

        it('should get a single category by ID', async () => {
            const res = await request(app)
                .get(`/api/categories/${categoryId}`)
                .set('Authorization', `Bearer ${memberToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.category.id).toBe(categoryId);
            expect(res.body.category.name).toBe('Get Test');
        });

        it('should return 404 for non-existent category', async () => {
            const fakeId = uuidv4();
            const res = await request(app)
                .get(`/api/categories/${fakeId}`)
                .set('Authorization', `Bearer ${memberToken}`);

            expect(res.status).toBe(404);
        });
    });

    describe('PUT /api/categories/:id', () => {
        let categoryId;

        beforeAll(async () => {
            const res = await request(app)
                .post('/api/categories')
                .set('Authorization', `Bearer ${memberToken}`)
                .send({
                    name: 'Update Me',
                    color: '#8B5CF6'
                });
            categoryId = res.body.category.id;
        });

        it('should update category details', async () => {
            const res = await request(app)
                .put(`/api/categories/${categoryId}`)
                .set('Authorization', `Bearer ${memberToken}`)
                .send({
                    name: 'Updated Name',
                    color: '#EC4899',
                    icon: 'star'
                });

            expect(res.status).toBe(200);
            expect(res.body.category.name).toBe('Updated Name');
            expect(res.body.category.color).toBe('#EC4899');
            expect(res.body.category.icon).toBe('star');
        });

        it('should validate color format on update', async () => {
            const res = await request(app)
                .put(`/api/categories/${categoryId}`)
                .set('Authorization', `Bearer ${memberToken}`)
                .send({
                    color: 'invalid'
                });

            expect(res.status).toBe(400);
        });

        it('should return 404 for non-existent category', async () => {
            const fakeId = uuidv4();
            const res = await request(app)
                .put(`/api/categories/${fakeId}`)
                .set('Authorization', `Bearer ${memberToken}`)
                .send({
                    name: 'Does Not Exist'
                });

            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /api/categories/:id', () => {
        let categoryId;

        beforeAll(async () => {
            const res = await request(app)
                .post('/api/categories')
                .set('Authorization', `Bearer ${memberToken}`)
                .send({
                    name: 'Delete Me',
                    color: '#EF4444'
                });
            categoryId = res.body.category.id;
        });

        it('should delete a category', async () => {
            const res = await request(app)
                .delete(`/api/categories/${categoryId}`)
                .set('Authorization', `Bearer ${memberToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            // Verify deletion
            const getRes = await request(app)
                .get(`/api/categories/${categoryId}`)
                .set('Authorization', `Bearer ${memberToken}`);

            expect(getRes.status).toBe(404);
        });

        it('should return 404 for non-existent category', async () => {
            const fakeId = uuidv4();
            const res = await request(app)
                .delete(`/api/categories/${fakeId}`)
                .set('Authorization', `Bearer ${memberToken}`);

            expect(res.status).toBe(404);
        });
    });

    describe('Category and Todo Integration', () => {
        let categoryId;
        let todoId;

        beforeAll(async () => {
            // Create a category
            const catRes = await request(app)
                .post('/api/categories')
                .set('Authorization', `Bearer ${memberToken}`)
                .send({
                    name: 'Integration Test',
                    color: '#06B6D4'
                });
            categoryId = catRes.body.category.id;

            // Create a todo with this category
            const todoRes = await request(app)
                .post('/api/todos')
                .set('Authorization', `Bearer ${memberToken}`)
                .send({
                    title: 'Todo with Category',
                    description: 'Testing category integration',
                    is_completed: false,
                    priority: 'medium',
                    category_id: categoryId
                });
            todoId = todoRes.body.todo.id;
        });

        it('should create todo with category_id', async () => {
            const res = await request(app)
                .get(`/api/todos/${todoId}`)
                .set('Authorization', `Bearer ${memberToken}`);

            expect(res.status).toBe(200);
            expect(res.body.todo.category_id).toBe(categoryId);
        });

        it('should remove category_id from todos when category is deleted', async () => {
            // Delete the category
            await request(app)
                .delete(`/api/categories/${categoryId}`)
                .set('Authorization', `Bearer ${memberToken}`);

            // Check that todo's category_id is now null
            const res = await request(app)
                .get(`/api/todos/${todoId}`)
                .set('Authorization', `Bearer ${memberToken}`);

            expect(res.status).toBe(200);
            expect(res.body.todo.category_id).toBeFalsy(); // Can be null or undefined
        });
    });
});
