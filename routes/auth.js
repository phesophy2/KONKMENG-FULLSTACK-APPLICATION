const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

// Rate limiting
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per windowMs
    message: 'Too many authentication attempts, please try again later'
});

// Email transporter setup
let transporter;

async function setupEmailTransport() {
    try {
        const testAccount = await nodemailer.createTestAccount();
        
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
        
        console.log('✅ Ethereal Email service ready');
        global.testAccount = testAccount;
    } catch (error) {
        console.error('❌ Email setup failed:', error);
    }
}

setupEmailTransport();

// Validation error handler
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            error: 'Validation failed',
            details: errors.array() 
        });
    }
    next();
};

/**
 * @route POST /api/auth/signup
 * @desc Register a new user
 */
router.post('/signup', 
    authLimiter,
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { name, email, password } = req.body;
            const responseLang = req.body.responseLang || 'en';
            
            // Check if user exists
            const existingUser = await User.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: responseLang === 'km' ? 'អ៊ីមែលនេះមានក្នុងប្រព័ន្ធរួចហើយ' : 'Email already exists'
                });
            }
            
            // Create user
            const user = await User.create({
                name,
                email: email.toLowerCase(),
                password
            });
            
            // Create JWT token
            const token = jwt.sign(
                { id: user._id, email: user.email, name: user.name },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '7d' }
            );
            
            console.log('✅ Signup successful for:', email);
            
            res.status(201).json({
                success: true,
                message: responseLang === 'km' ? 'បង្កើតគណនីជោគជ័យ' : 'Account created successfully',
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    savedCodes: user.savedCodes || [],
                    analysisHistory: user.analysisHistory || []
                }
            });
            
        } catch (error) {
            console.error('❌ SIGNUP ERROR:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: error.message
            });
        }
    }
);

/**
 * @route POST /api/auth/login
 * @desc Login user
 */
router.post('/login',
    authLimiter,
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { email, password } = req.body;
            const responseLang = req.body.responseLang || 'en';
            
            // Find user with password
            const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: responseLang === 'km' ? 'អ៊ីមែល ឬ ពាក្យសម្ងាត់មិនត្រឹមត្រូវ' : 'Invalid email or password'
                });
            }
            
            // Verify password
            const isPasswordValid = await user.comparePassword(password);
            
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    error: responseLang === 'km' ? 'អ៊ីមែល ឬ ពាក្យសម្ងាត់មិនត្រឹមត្រូវ' : 'Invalid email or password'
                });
            }
            
            // Update last login
            user.lastLogin = new Date();
            await user.save();
            
            // Create token
            const token = jwt.sign(
                { id: user._id, email: user.email, name: user.name },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '7d' }
            );
            
            res.json({
                success: true,
                message: responseLang === 'km' ? 'ចូលគណនីជោគជ័យ' : 'Login successful',
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    savedCodes: user.savedCodes || [],
                    analysisHistory: user.analysisHistory || []
                }
            });
            
        } catch (error) {
            console.error('❌ Login error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: responseLang === 'km' ? 'មានបញ្ហាក្នុងប្រព័ន្ធ' : 'Internal server error'
            });
        }
    }
);

/**
 * @route GET /api/auth/profile
 * @desc Get user profile
 */
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                savedCodes: user.savedCodes || [],
                analysisHistory: user.analysisHistory || [],
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }
        });
        
    } catch (error) {
        console.error('❌ Profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: error.message
        });
    }
});

// JWT Authentication Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            error: 'No token provided', 
            message: 'សូមចូលគណនីជាមុនសិន' 
        });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                error: 'Invalid token', 
                message: 'Token មិនត្រឹមត្រូវ ឬអស់សុពលភាព' 
            });
        }
        req.user = user;
        next();
    });
}

module.exports = router;
