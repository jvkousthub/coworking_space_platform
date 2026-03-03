// middleware/auth.js – JWT authentication middleware

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'coworking_jwt_secret_key_2024';
const JWT_EXPIRES_IN = '7d';

/**
 * Middleware: requires a valid Bearer JWT in Authorization header.
 * Attaches decoded user payload to req.user on success.
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Access denied. Please log in to continue.'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id, email, name, iat, exp }
        next();
    } catch (err) {
        return res.status(403).json({
            success: false,
            error: 'Session expired or invalid. Please log in again.'
        });
    }
}

/**
 * Middleware: optional auth – attaches user if token present, proceeds anyway.
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        try {
            req.user = jwt.verify(token, JWT_SECRET);
        } catch (_) {
            req.user = null;
        }
    }
    next();
}

module.exports = { authenticateToken, optionalAuth, JWT_SECRET, JWT_EXPIRES_IN };
