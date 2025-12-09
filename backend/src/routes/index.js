import { Router } from "express";
import tenantRoutes from "./tenant/index.js";
import userRoutes from "./user/index.js";
import todoRoutes from "./todos/index.js";
import categoryRoutes from "./categories/index.js";

const router = Router();
router.use('/tenant', tenantRoutes);
router.use('/user', userRoutes);
router.use('/todos', todoRoutes);
router.use('/categories', categoryRoutes);

export default router;