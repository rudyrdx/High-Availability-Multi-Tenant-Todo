// routes/tenant/index.js
import { Router } from "express";
import { z } from 'zod';
import driver from "../../config/neo4j.js";
import { validate } from "../../middleware/validate.js";
import { hashPassword } from "../../service/password.service.js";

const router = Router();

const lookupSchema = z.object({
  tenantName: z.string().min(1).max(100)
});

const createSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  email: z.string().email(),
  fullName: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  inviteKey: z.string().min(1)
});

/**
 * @swagger
 * /api/tenant/lookup:
 *   post:
 *     summary: Lookup tenant by name or slug
 *     tags: [Tenant]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenantName
 *             properties:
 *               tenantName:
 *                 type: string
 *                 example: acme
 *                 description: Tenant name or slug to lookup
 *     responses:
 *       200:
 *         description: Tenant found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 tenantId:
 *                   type: string
 *                   format: uuid
 *                 redirectTo:
 *                   type: string
 *                   example: /login?tenant=123e4567-e89b-12d3-a456-426614174000
 *       404:
 *         description: Tenant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/lookup', validate(lookupSchema), async (req, res) => {
  const session = driver.session();
  try {
    const { tenantName } = req.body;

    // Look up by name or slug
    const result = await session.run(
      'MATCH (t:Tenant) WHERE (t.name = $tenantName OR t.slug = $tenantName) AND t.isActive = true RETURN t',
      { tenantName }
    );

    if (result.records.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    const tenant = result.records[0].get('t').properties;

    res.json({
      success: true,
      tenantId: tenant.id,
      redirectTo: `/login?tenant=${tenant.id}`
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * @swagger
 * /api/tenant/create:
 *   post:
 *     summary: Create a new tenant with admin user
 *     tags: [Tenant]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - slug
 *               - email
 *               - fullName
 *               - password
 *               - inviteKey
 *             properties:
 *               name:
 *                 type: string
 *                 example: Acme Corporation
 *               slug:
 *                 type: string
 *                 pattern: '^[a-z0-9-]+$'
 *                 example: acme
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@acme.com
 *               fullName:
 *                 type: string
 *                 example: John Doe
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: SecurePass123!
 *               inviteKey:
 *                 type: string
 *                 example: chronos-beta
 *     responses:
 *       201:
 *         description: Tenant created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 tenant:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     slug:
 *                       type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *       400:
 *         description: Validation error, duplicate slug/email, or invalid invite key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/create', validate(createSchema), async (req, res) => {
  const session = driver.session();
  try {
    const { name, slug, email, fullName, password, inviteKey } = req.body;


    // Check for duplicate slug or email
    const dupCheck = await session.run(
      'MATCH (t:Tenant {slug: $slug}) RETURN t.id AS id UNION MATCH (u:User {email: $email}) RETURN u.id AS id',
      { slug, email }
    );
    if (dupCheck.records.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tenant slug or email already exists'
      });
    }

    // Verify invite key
    const keyCheck = await session.run(
      'MATCH (i:InviteKey {key: $inviteKey, isUsed: false}) RETURN i',
      { inviteKey }
    );
    if (keyCheck.records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or already used invite key'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create tenant, admin user, and relationships
    const result = await session.run(`
      MATCH (i:InviteKey {key: $inviteKey})
      CREATE (t:Tenant {
        id: randomUUID(),
        name: $name,
        slug: $slug,
        isActive: true
      })
      CREATE (u:User {
        id: randomUUID(),
        tenant_id: t.id,
        username: split($email, '@')[0],
        email: $email,
        full_name: $fullName,
        password: $password,
        role: 'admin',
        created_at: datetime().epochMillis
      })
      CREATE (t)-[:HAS_USER]->(u)
      CREATE (i)-[:INVITED]->(u)
      CREATE (i)-[:INVITED_TENANT]->(t)
      SET i.isUsed = true, i.usedAt = datetime().epochMillis, i.usedBy = u.id
      RETURN t, u
    `, { name, slug, email, fullName, password: hashedPassword, inviteKey });

    const tenant = result.records[0].get('t').properties;
    const user = result.records[0].get('u').properties;

    res.status(201).json({
      success: true,
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      user: { id: user.id, email: user.email, role: user.role }
    });

  } catch (error) {
    console.error('Tenant create error:', error);
    // Handle Neo4j constraint errors and validation errors
    if (error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed' || error.code === 'Neo.ClientError.Statement.SyntaxError') {
      return res.status(400).json({
        success: false,
        message: 'Tenant slug or email already exists'
      });
    }
    if (error.message && error.message.includes('InviteKey')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or already used invite key'
      });
    }
    res.status(500).json({ error: error.message, code: error.code });
  } finally {
    await session.close();
  }
});

export default router;