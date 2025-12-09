import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import routes from "./routes/index.js";
import { tenantMiddleware } from "./middleware/tenant.js";
import swaggerSpec from "./config/swagger.js";

const app = express();

// CORS Configuration
const corsOptions = {
    origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4200'],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id']
};

app.use(cors(corsOptions));
app.use(express.json());

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Multi-Tenant Todo API Docs'
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(tenantMiddleware);  // Multi-tenancy applied globally
app.use("/api", routes);

export default app;