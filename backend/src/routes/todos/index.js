import { Router } from "express";
import { z } from "zod";
import driver from "../../config/neo4j.js";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";

const router = Router();

const createTodoSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    is_completed: z.boolean(),
    due_date: z.string().nullable().optional(),
    priority: z.enum(['low', 'medium', 'high']),
    category_id: z.string().nullable().optional()
});

const updateTodoSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    is_completed: z.boolean().optional(),
    due_date: z.string().nullable().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    category_id: z.string().nullable().optional()
});

/**
 * @swagger
 * /api/todos:
 *   post:
 *     summary: Create a new todo
 *     tags: [Todo]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - is_completed
 *               - priority
 *             properties:
 *               title:
 *                 type: string
 *                 example: Complete project documentation
 *               description:
 *                 type: string
 *                 example: Write comprehensive API documentation
 *               is_completed:
 *                 type: boolean
 *                 example: false
 *               due_date:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 example: 2024-12-31T23:59:59Z
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 example: high
 *               category_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Todo created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 todo:
 *                   $ref: '#/components/schemas/Todo'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: User does not belong to tenant
 */
// Create Todo
router.post("/", requireAuth, validate(createTodoSchema), async (req, res) => {
    const session = driver.session();
    try {
        const { title, description, is_completed, due_date, priority, category_id } = req.body;
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
        const completed_at = is_completed ? now : null;

        let query = `
            MATCH (u:User {id: $userId})
            MATCH (t:Tenant {id: $tenantId})
            CREATE (todo:Todo {
                id: randomUUID(),
                title: $title,
                description: $description,
                is_completed: $is_completed,
                due_date: $due_date,
                priority: $priority,
                completed_at: $completed_at,
                created_at: $now,
                updated_at: $now,
                user_id: $userId,
                tenant_id: $tenantId,
                category_id: $category_id
            })
            CREATE (todo)-[:BELONGS_TO]->(t)
            CREATE (todo)-[:CREATED_BY]->(u)
            RETURN todo
        `;

        // We handle category relationship separately or we could use OPTIONAL MATCH in the create query if we are sure it exists.
        // But let's create the base todo first, then add category relation if needed. 
        // Or do it in one transaction. Let's do it in one transaction if possible.
        // However, if category_id is invalid, should it fail? The interface implies FK, so yes.
        // But for simplicity/safety against Cypher syntax errors with conditionals, let's do it after or use FOREACH trick.

        // I'll stick to basic CREATE and then optional category link.

        const result = await session.run(query, {
            title, description: description || null, is_completed, due_date: due_date || null,
            priority, completed_at, now, userId, tenantId, category_id: category_id || null
        });

        const todoNode = result.records[0].get("todo");
        const createdTodo = todoNode.properties;
        const todoId = createdTodo.id;

        if (category_id) {
            await session.run(`
                MATCH (todo:Todo {id: $todoId})
                MATCH (c:Category {id: $categoryId})
                MERGE (todo)-[:HAS_CATEGORY]->(c)
             `, { todoId, categoryId: category_id });
        }

        res.status(201).json({ success: true, todo: createdTodo });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        await session.close();
    }
});

/**
 * @swagger
 * /api/todos:
 *   get:
 *     summary: Get all todos for the authenticated user
 *     tags: [Todo]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of todos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 todos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Todo'
 *       401:
 *         description: Unauthorized
 */
// Get Todos (List)
router.get("/", requireAuth, async (req, res) => {
    const session = driver.session();
    try {
        const { userId, tenantId } = req.user;
        const result = await session.run(`
            MATCH (t:Tenant {id: $tenantId})<-[:BELONGS_TO]-(todo:Todo)-[:CREATED_BY]->(u:User {id: $userId})
            RETURN todo
            ORDER BY todo.created_at DESC
        `, { tenantId, userId });

        const todos = result.records.map(record => record.get("todo").properties);
        res.json({ success: true, todos });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        await session.close();
    }
});

/**
 * @swagger
 * /api/todos/{id}:
 *   get:
 *     summary: Get a single todo by ID
 *     tags: [Todo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Todo ID
 *     responses:
 *       200:
 *         description: Todo details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 todo:
 *                   $ref: '#/components/schemas/Todo'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Todo not found
 */
// Get Single Todo
router.get("/:id", requireAuth, async (req, res) => {
    const session = driver.session();
    try {
        const { id } = req.params;
        const { userId, tenantId } = req.user;

        const result = await session.run(`
            MATCH (t:Tenant {id: $tenantId})<-[:BELONGS_TO]-(todo:Todo {id: $id})-[:CREATED_BY]->(u:User {id: $userId})
            RETURN todo
        `, { tenantId, userId, id });

        if (result.records.length === 0) {
            return res.status(404).json({ success: false, message: "Todo not found" });
        }

        const todo = result.records[0].get("todo").properties;
        res.json({ success: true, todo });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        await session.close();
    }
});

/**
 * @swagger
 * /api/todos/{id}:
 *   put:
 *     summary: Update a todo
 *     tags: [Todo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Todo ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               is_completed:
 *                 type: boolean
 *               due_date:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *               category_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Todo updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 todo:
 *                   $ref: '#/components/schemas/Todo'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Todo not found or unauthorized
 */
// Update Todo
router.put("/:id", requireAuth, validate(updateTodoSchema), async (req, res) => {
    const session = driver.session();
    try {
        const { id } = req.params;
        const { userId, tenantId } = req.user;
        const updates = req.body;
        const now = new Date().toISOString();

        // Prepare updates
        // We only want to set provided fields
        // Cypher's += operator works well for partial updates from a map

        // We need to construct the map carefully because updates contains undefined for missing fields?
        // Express body parser usually excludes missing keys unless sent as null.
        // Zod validation passes objects with present keys.

        let updateMap = { ...updates, updated_at: now };

        if (updates.is_completed === true) {
            updateMap.completed_at = now;
        } else if (updates.is_completed === false) {
            updateMap.completed_at = null;
        }

        const result = await session.run(`
            MATCH (t:Tenant {id: $tenantId})<-[:BELONGS_TO]-(todo:Todo {id: $id})-[:CREATED_BY]->(u:User {id: $userId})
            SET todo += $updateMap
            RETURN todo
        `, { tenantId, userId, id, updateMap });

        if (result.records.length === 0) {
            return res.status(404).json({ success: false, message: "Todo not found or unauthorized" });
        }

        if (updates.category_id !== undefined) {
            // Remove old relation
            await session.run(`
                MATCH (todo:Todo {id: $id})-[r:HAS_CATEGORY]->()
                DELETE r
             `, { id });

            if (updates.category_id) {
                await session.run(`
                    MATCH (todo:Todo {id: $id})
                    MATCH (c:Category {id: $categoryId})
                    MERGE (todo)-[:HAS_CATEGORY]->(c)
                 `, { id, categoryId: updates.category_id });
            }
        }

        const todo = result.records[0].get("todo").properties;
        res.json({ success: true, todo });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        await session.close();
    }
});

/**
 * @swagger
 * /api/todos/{id}:
 *   delete:
 *     summary: Delete a todo (Admin only)
 *     tags: [Todo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Todo ID
 *     responses:
 *       200:
 *         description: Todo deleted successfully
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
 *                   example: Todo deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Todo not found
 */
// Delete Todo (Admin Only)
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
    const session = driver.session();
    try {
        const { id } = req.params;
        const { tenantId } = req.user;

        const result = await session.run(`
            MATCH (t:Tenant {id: $tenantId})<-[:BELONGS_TO]-(todo:Todo {id: $id})
            DETACH DELETE todo
            RETURN count(todo) as deletedCount
        `, { tenantId, id });

        if (result.records[0].get("deletedCount").toNumber() === 0) {
            return res.status(404).json({ success: false, message: "Todo not found" });
        }

        res.json({ success: true, message: "Todo deleted" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        await session.close();
    }
});

export default router;
