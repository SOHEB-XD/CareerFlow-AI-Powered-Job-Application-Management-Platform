const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

/**
 * Common cookie options for authentication session tokens.
 *
 * POLICY & TOPOLOGY:
 * For the initial deployment using separate frontend (Static Site) and backend (Web Service)
 * Render hostnames (e.g. careerflow-web.onrender.com and careerflow-api.onrender.com),
 * requests between the two are cross-site. Under HTTPS, SameSite=None combined with
 * Secure=true is required so that the browser transmits the HTTP-only cookie on cross-site
 * credentialed requests (withCredentials: true).
 *
 * NOTE ON THIRD-PARTY COOKIE RESTRICTIONS:
 * SameSite=None permits cross-site transmission where supported, but does NOT bypass
 * browsers, extensions, or incognito modes that aggressively block third-party cookies entirely.
 *
 * CUSTOM DOMAIN REASSESSMENT:
 * Once the frontend and backend are migrated under a unified custom apex domain (e.g.,
 * app.yourdomain.com and api.yourdomain.com), this policy should be reassessed and preferably
 * transitioned to an appropriate same-site policy (such as SameSite=Lax or SameSite=Strict
 * with a common parent domain) to minimize cross-site exposure.
 *
 * In local development (NODE_ENV !== 'production'), SameSite=Strict and Secure=false are
 * preserved for standard HTTP localhost operation.
 */
const getAuthCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    path: '/'
});

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body || {};

        if (!name || typeof name !== 'string' || !name.trim() ||
            !email || typeof email !== 'string' || !email.trim() ||
            !password || typeof password !== 'string') {
            return res.status(400).json({ message: 'Please provide all the required fields' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({ name: name.trim(), email: normalizedEmail, password: hashedPassword });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.cookie('token', token, {
            ...getAuthCookieOptions(),
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                name: user.name,
                email: user.email,
                id: user._id
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'User already exists' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        console.error('[Auth Register Error]:', error.message);
        res.status(500).json({ message: 'An unexpected internal error occurred' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (!user.password) {
            return res.status(401).json({
                message: 'This account was registered with Google Sign-In. Please sign in using Continue with Google.'
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.cookie('token', token, {
            ...getAuthCookieOptions(),
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.status(200).json({
            success: true,
            message: 'User logged in successfully',
            user: {
                name: user.name,
                email: user.email,
                id: user._id
            }
        });
    } catch (error) {
        console.error('[Auth Login Error]:', error.message);
        res.status(500).json({ message: 'An unexpected internal error occurred' });
    }
};

const getMe = (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({
            success: true,
            message: 'User fetched successfully',
            user: {
                name: user.name,
                email: user.email,
                id: user._id
            }
        });
    } catch (error) {
        console.error('[Auth getMe Error]:', error.message);
        res.status(500).json({ message: 'An unexpected internal error occurred' });
    }
};

const logout = async (req, res) => {
    try {
        res.cookie('token', '', {
            ...getAuthCookieOptions(),
            expires: new Date(0)
        });

        res.status(200).json({
            success: true,
            message: 'User logged out successfully'
        });
    } catch (error) {
        console.error('[Auth Logout Error]:', error.message);
        res.status(500).json({ message: 'An unexpected internal error occurred' });
    }
};

/**
 * Authenticate with verified Google ID token.
 * Validates Google ID token cryptographic signature, expiry, and audience using google-auth-library.
 * Scopes account access to verified Google 'sub' claim.
 */
const googleAuth = async (req, res) => {
    try {
        const { credential } = req.body || {};

        if (!credential || typeof credential !== 'string' || credential.trim().length < 50 || credential.length > 8192) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Google credential token.'
            });
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId) {
            console.error('[Google Auth Error]: GOOGLE_CLIENT_ID environment variable is not configured');
            return res.status(503).json({
                success: false,
                message: 'Google Sign-In is temporarily unavailable on the server.'
            });
        }

        const client = new OAuth2Client(clientId);
        let payload;
        try {
            const ticket = await client.verifyIdToken({
                idToken: credential.trim(),
                audience: clientId
            });
            payload = ticket.getPayload();
        } catch (verifyErr) {
            console.error('[Google Token Verification Error]:', verifyErr.message);
            return res.status(401).json({
                success: false,
                message: 'Google authentication failed. The token is invalid or has expired.'
            });
        }

        if (!payload || !payload.sub) {
            return res.status(401).json({
                success: false,
                message: 'Google authentication failed: missing verified identity.'
            });
        }

        // Require verified Google email
        if (!payload.email_verified) {
            return res.status(400).json({
                success: false,
                message: 'Your Google email address is not verified. Please verify your Google email before signing in.'
            });
        }

        if (!payload.email || typeof payload.email !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Google token does not contain a valid email address.'
            });
        }

        const normalizedEmail = payload.email.trim().toLowerCase();
        const googleSub = payload.sub;

        // 1. Look up existing Google-linked account by verified sub
        let user = await User.findOne({ googleId: googleSub });

        if (!user) {
            // 2. Check if an account already exists with this email address
            const existingUser = await User.findOne({ email: normalizedEmail });

            if (existingUser) {
                // An account exists with this email, but is not linked to this Google ID.
                // Prevent duplicate accounts and do NOT silently link without existing auth.
                return res.status(409).json({
                    success: false,
                    message: 'An account with this email already exists. Please sign in with your email and password.'
                });
            }

            // 3. Brand new user -> Create Google-linked account
            const displayName = payload.name?.trim() || normalizedEmail.split('@')[0];
            try {
                user = await User.create({
                    name: displayName,
                    email: normalizedEmail,
                    googleId: googleSub,
                    authProvider: 'google'
                });
            } catch (createErr) {
                if (createErr.code === 11000) {
                    // Handled concurrent attempt
                    user = await User.findOne({ googleId: googleSub });
                    if (!user) {
                        return res.status(409).json({
                            success: false,
                            message: 'An account with this email already exists. Please sign in with your email and password.'
                        });
                    }
                } else {
                    throw createErr;
                }
            }
        }

        // Establish CareerFlow session via standard HTTP-only JWT cookie
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.cookie('token', token, {
            ...getAuthCookieOptions(),
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        return res.status(200).json({
            success: true,
            message: 'Signed in with Google successfully',
            user: {
                name: user.name,
                email: user.email,
                id: user._id
            }
        });
    } catch (error) {
        console.error('[Google Auth Controller Error]:', error.message);
        return res.status(500).json({
            success: false,
            message: 'An unexpected internal error occurred during Google sign-in'
        });
    }
};

module.exports = { register, login, getMe, logout, googleAuth };