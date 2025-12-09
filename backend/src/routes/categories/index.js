import { Router } from "express";
import { z } from "zod";
import driver from "../../config/neo4j.js";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";

const router = Router();

const createCategorySchema = z.object({
    name: z.string().min(1).max(100),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code'),
    icon: z.string().optional()
});

const updateCategorySchema = z.object({
    name: z.string().min(1).max(100).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code').optional(),
    icon: z.string().optional()
});

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Category]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - color
 *             properties:
 *               name:
 *                 type: string
 *                 example: Work
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *                 example: '#3B82F6'
 *               icon:
 *                 type: string
 *                 example: briefcase
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 category:
 *                   $ref: '#/components/schemas/Category'
 *       401:
 *         description: Unauthorized
 */
router.post("/", requireAuth, validate(createCategorySchema), async (req, res) => {
    const session = driver.session();
    try {
        const { name, color, icon } = req.body;
        const { userId, tenantId } = req.user;

        // Verify Tenant Membership
        const membershipCheck = await session.run(
            `MATCH (t:Tenant {id: $tenantId})-[:HAS_USER]->(u:User {id: $userId}) RETURN u`,
            { tenantId, userId }
        );

        if (membershipCheck.records.length === 0) {
            return res.status(403).json({ success: false, message: "User does not belong to this tenant" });
        }

        const now = new Date().toISOString();

        const result = await session.run(`
            MATCH (u:User {id: $userId})
            MATCH (t:Tenant {id: $tenantId})
            CREATE (category:Category {
                id: randomUUID(),
                name: $name,
                color: $color,
                icon: $icon,
                created_at: $now,
                user_id: $userId,
                tenant_id: $tenantId
            })
            CREATE (category)-[:BELONGS_TO]->(t)
            CREATE (category)-[:CREATED_BY]->(u)
            RETURN category
        `, { name, color, icon: icon || null, now, userId, tenantId });

        const category = result.records[0].get("category").properties;
        res.status(201).json({ success: true, category });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        await session.close();
    }
});

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories for the authenticated user
 *     tags: [Category]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 categories:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 *       401:
 *         description: Unauthorized
 */
router.get("/", requireAuth, async (req, res) => {
    const session = driver.session();
    try {
        const { userId, tenantId } = req.user;
        const result = await session.run(`
            MATCH (t:Tenant {id: $tenantId})<-[:BELONGS_TO]-(category:Category)-[:CREATED_BY]->(u:User {id: $userId})
            RETURN category
            ORDER BY category.created_at DESC
        `, { tenantId, userId });

        const categories = result.records.map(record => record.get("category").properties);
        res.json({ success: true, categories });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        await session.close();
    }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get a single category by ID
 *     tags: [Category]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 category:
 *                   $ref: '#/components/schemas/Category'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 */
router.get("/:id", requireAuth, async (req, res) => {
    const session = driver.session();
    try {
        const { id } = req.params;
        const { userId, tenantId } = req.user;

        const result = await session.run(`
            MATCH (t:Tenant {id: $tenantId})<-[:BELONGS_TO]-(category:Category {id: $id})-[:CREATED_BY]->(u:User {id: $userId})
            RETURN category
        `, { tenantId, userId, id });

        if (result.records.length === 0) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        const category = result.records[0].get("category").properties;
        res.json({ success: true, category });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        await session.close();
    }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update a category
 *     tags: [Category]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *               icon:
 *                 type: string
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 category:
 *                   $ref: '#/components/schemas/Category'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found or unauthorized
 */
router.put("/:id", requireAuth, validate(updateCategorySchema), async (req, res) => {
    const session = driver.session();
    try {
        const { id } = req.params;
        const { userId, tenantId } = req.user;
        const updates = req.body;

        const result = await session.run(`
            MATCH (t:Tenant {id: $tenantId})<-[:BELONGS_TO]-(category:Category {id: $id})-[:CREATED_BY]->(u:User {id: $userId})
            SET category += $updates
            RETURN category
        `, { tenantId, userId, id, updates });

        if (result.records.length === 0) {
            return res.status(404).json({ success: false, message: "Category not found or unauthorized" });
        }

        const category = result.records[0].get("category").properties;
        res.json({ success: true, category });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        await session.close();
    }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     tags: [Category]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Category deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 */
router.delete("/:id", requireAuth, async (req, res) => {
    const session = driver.session();
    try {
        const { id } = req.params;
        const { userId, tenantId } = req.user;

        // First, remove category references from todos
        await session.run(`
            MATCH (todo:Todo {category_id: $id})
            SET todo.category_id = null
        `, { id });

        // Then delete the category
        const result = await session.run(`
            MATCH (t:Tenant {id: $tenantId})<-[:BELONGS_TO]-(category:Category {id: $id})-[:CREATED_BY]->(u:User {id: $userId})
            DETACH DELETE category
            RETURN count(category) as deletedCount
        `, { tenantId, userId, id });

        if (result.records[0].get("deletedCount").toNumber() === 0) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        res.json({ success: true, message: "Category deleted" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        await session.close();
    }
});

export default router;
