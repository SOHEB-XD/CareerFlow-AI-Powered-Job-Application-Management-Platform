/**
 * Rate Limiting Middleware
 * Protects authentication, AI generation, file upload, and general API routes
 * against brute-force, denial-of-service, and resource exhaustion attacks.
 *
 * NOTE ON TRUST PROXY:
 * Express 'trust proxy' is deliberately NOT enabled globally here because the application
 * is not yet deployed to a specific cloud provider/reverse proxy. In production behind
 * a reverse proxy (e.g., Cloudflare, AWS ALB, Nginx, Render), 'trust proxy' must be set
 * to the specific proxy hop count or CIDR range in server.js to ensure accurate client IP resolution.
 *
 * NOTE ON SCALING:
 * For multi-instance/horizontal scaling, a distributed memory store (such as Redis with
 * rate-limit-redis) should be configured to share rate-limit counters across all application nodes.
 */

const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

/**
 * 1. Authentication Limiter (Login & Registration)
 * Policy: 10 requests per 15 minutes per client IP.
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many authentication attempts. Please try again after 15 minutes.'
    }
});

/**
 * User-keyed rate limit key generator
 * Uses authenticated user ID from verified JWT (req.user._id).
 * Never trusts client-supplied headers or body parameters for identity.
 * Falls back to canonical client IP if user context is unavailable.
 */
const generateUserOrIpKey = (req) => {
    if (req.user && req.user._id) {
        return `user_${req.user._id.toString()}`;
    }
    return ipKeyGenerator(req);
};

/**
 * 2. Generative AI Limiter (Email Studio generation, Target Company AI, Follow-up AI)
 * Policy: 10 requests per hour per authenticated user.
 */
const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: generateUserOrIpKey,
    message: {
        success: false,
        message: 'AI generation limit reached (10 requests per hour). Please try again later.'
    }
});

/**
 * 3. Resume Upload Limiter
 * Policy: 10 uploads per hour per authenticated user.
 */
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: generateUserOrIpKey,
    message: {
        success: false,
        message: 'Resume upload limit reached (10 uploads per hour). Please try again later.'
    }
});

/**
 * 4. General API Traffic Limiter
 * Policy: 300 requests per 15 minutes per client IP.
 * Sufficient for normal dashboard browsing, polling, and stats while protecting the server.
 */
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests, please try again later.'
    }
});

module.exports = {
    authLimiter,
    aiLimiter,
    uploadLimiter,
    globalLimiter
};
