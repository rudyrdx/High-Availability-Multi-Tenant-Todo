import jwt from "jsonwebtoken";

export function tenantMiddleware(req, res, next) {
    // If it's the login route, read from headers
    if (req.path === "/login") {
        req.tenantId = req.headers["x-tenant-id"] || "tenantA";
        return next();
    }

    // Otherwise, read from JWT
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        try {
            const payload = jwt.decode(token);
            req.tenantId = payload?.tenantId || "tenantA";
        } catch (err) {
            req.tenantId = "tenantA";
        }
    } else {
        req.tenantId = "tenantA";
    }
    next();
}
