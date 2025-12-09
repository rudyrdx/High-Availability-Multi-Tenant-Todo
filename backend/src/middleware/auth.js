import jwt from "jsonwebtoken";

export const requireAuth = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Unauthorized: Missing token" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = payload; // Expected: { userId, tenantId, role }
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "Unauthorized: Invalid token" });
    }
};

export const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: "Forbidden: Admin access required" });
    }
    next();
};
