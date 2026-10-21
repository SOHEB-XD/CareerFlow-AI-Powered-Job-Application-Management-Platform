const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({ name, email, password: hashedPassword });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'strict'
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
        res.status(500).json({ message: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'strict'
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
        res.status(500).json({ message: error.message });
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
        res.status(500).json({ message: error.message });
    }
}

const logout = async (req, res) => {
    try {
        res.cookie('token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            expires: new Date(0),
            sameSite: 'strict'
        });

        res.status(200).json({
            success: true,
            message: 'User logged out successfully'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { register, login, getMe, logout };