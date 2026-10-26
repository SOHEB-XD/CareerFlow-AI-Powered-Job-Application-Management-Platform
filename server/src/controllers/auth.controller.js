const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');

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

module.exports = { register, login, getMe, logout };