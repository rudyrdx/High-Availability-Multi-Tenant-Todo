// routes/user/index.js
import { Router } from "express";
import { z } from 'zod';
import driver from "../../config/neo4j.js";
import jwt from "jsonwebtoken";
import { validate } from "../../middleware/validate.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import { hashPassword, comparePassword } from "../../service/password.service.js";
const router = Router();

const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'member'])
});

const loginSchema = z.object({
  tenantId: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1)
});

/**
 * @swagger
 * /api/user/create:
 *   post:
 *     summary: Create a new user (Admin only)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - fullName
 *               - password
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: newuser@acme.com
 *               fullName:
 *                 type: string
 *                 example: Jane Smith
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: SecurePass123!
 *               role:
 *                 type: string
 *                 enum: [admin, member]
 *                 example: member
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error or email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Tenant not found
 */
router.post('/create', requireAuth, requireAdmin, validate(createUserSchema), async (req, res) => {
  const session = driver.session();
  try {
    const { email, fullName, password, role } = req.body;
    const { tenantId } = req.user;

    // Check for duplicate email
    const dupCheck = await session.run(
      'MATCH (u:User {email: $email}) RETURN u',
      { email }
    );
    if (dupCheck.records.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user node and relationship
    const result = await session.run(`
      MATCH (t:Tenant {id: $tenantId})
      CREATE (u:User {
        id: randomUUID(),
        tenant_id: t.id,
        username: split($email, '@')[0],
        email: $email,
        full_name: $fullName,
        password: $password,
        role: $role,
        created_at: datetime().epochMillis
      })
      CREATE (t)-[:HAS_USER]->(u)
      RETURN t, u
    `, { tenantId, email, fullName, password: hashedPassword, role });

    // If tenant not found, MATCH won't return t
    if (result.records.length === 0 || !result.records[0].get('t')) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }
    const user = result.records[0].get('u').properties;
    // Remove password from response
    const { password: _, ...userSafe } = user;
    res.status(201).json({ success: true, user: userSafe });
  } catch (error) {
    if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * @swagger
 * /api/user/login:
 *   post:
 *     summary: User login
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenantId
 *               - email
 *               - password
 *             properties:
 *               tenantId:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@acme.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 *       404:
 *         description: User not found
 */
router.post('/login', validate(loginSchema), async (req, res) => {
  const session = driver.session();
  try {
    const { tenantId, email, password } = req.body;
    // Find user in tenant
    const result = await session.run(`
      MATCH (t:Tenant {id: $tenantId})-[:HAS_USER]->(u:User {email: $email})
      RETURN u
    `, { tenantId, email });
    if (result.records.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const user = result.records[0].get('u').properties;

    // Verify password
    if (!user.password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Issue JWT
    const token = jwt.sign(
      { userId: user.id, tenantId: user.tenant_id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    // Remove password from response
    const { password: _, ...userSafe } = user;
    res.status(200).json({ success: true, token, user: userSafe });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await session.close();
  }
});

export default router;
