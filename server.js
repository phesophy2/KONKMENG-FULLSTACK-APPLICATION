const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const redis = require('redis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
app.use(cors());                    
app.use(express.json());            
app.use(express.static('public'));  

// ===== EMAIL CONFIGURATION (ETHEREAL) =====
let transporter;

async function setupEmailTransport() {
    try {
        // Create a test account with Ethereal Email
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
        console.log('📧 Test Email:', testAccount.user);
        console.log('🔐 Password:', testAccount.pass);
        console.log('💡 Preview emails at: https://ethereal.email');
        
        // Store for later use
        global.testAccount = testAccount;
    } catch (error) {
        console.error('❌ Email setup failed:', error);
    }
}

// Initialize email on startup
setupEmailTransport();

// ===== REDIS CONFIGURATION =====
let redisClient;
let isRedisConnected = false;

async function setupRedis() {
    try {
        // Explicitly use 127.0.0.1:6379 for local Redis
        const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
        console.log('🔌 Attempting Redis connection to:', redisUrl);
        
        redisClient = redis.createClient({
            url: redisUrl,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 3) {
                        console.log('⚠️  Redis: Max reconnection attempts reached');
                        return false;
                    }
                    return Math.min(retries * 100, 3000);
                }
            }
        });

        redisClient.on('error', (err) => {
            console.log('⚠️  Redis Client Error:', err.message);
            isRedisConnected = false;
        });

        redisClient.on('connect', () => {
            console.log('✅ Redis connected successfully to 127.0.0.1:6379');
            isRedisConnected = true;
        });

        redisClient.on('ready', () => {
            console.log('✅ Redis ready to use');
            isRedisConnected = true;
        });

        await redisClient.connect();
    } catch (error) {
        console.log('⚠️  Redis connection failed:', error.message);
        console.log('⚠️  Server will continue without caching (Graceful Degradation)');
        isRedisConnected = false;
    }
}

// Initialize Redis
setupRedis();

// ===== GEMINI API CONFIGURATION =====
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

console.log('\n🔍 ===== KONKMENG AI SYSTEM v5.0 =====');
console.log('🔑 GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('🔑 MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('🔑 JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('📧 EMAIL_SERVICE: Ethereal Email (Test/Development)');
console.log('💾 REDIS_CACHE: Initializing...');
console.log('🔒 SECURITY_AUDIT: Advanced (SQL, XSS, Secrets)');
console.log('🔑 PORT:', PORT);
console.log('====================================\n');

// ===== DATABASE CONNECTION =====
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/konkmen')
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.log('⚠️ Server will continue running without database - some features will be unavailable');
});

// ===== USER SCHEMA & MODEL =====
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        minlength: 8,
        select: false
    },
    avatar: {
        type: String,
        default: null
    },
    bio: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date
    },
    passwordResetToken: String,
    passwordResetExpiry: Date,
    googleId: String,
    githubId: String,
    savedCodes: [{
        title: String,
        code: String,
        language: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    analysisHistory: [{
        code: String,
        language: String,
        analysis: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Encrypt password before saving
userSchema.pre('save', async function() {
    try {
        console.log('🔐 Hashing password for user:', this.email);
        
        if (!this.isModified('password')) {
            return;
        }
        
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        console.log('✅ Password hashed successfully');
    } catch (error) {
        console.error('❌ Error hashing password:', error);
        throw error;
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        console.error('❌ Error comparing password:', error);
        return false;
    }
};

const User = mongoose.model('User', userSchema);

// ===== JWT AUTHENTICATION MIDDLEWARE =====
const authenticateToken = (req, res, next) => {
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
};

// ===== AUTH ROUTES =====

/**
 * @route POST /api/auth/signup
 * @desc Register a new user
 */
app.post('/api/auth/signup', async (req, res) => {
    try {
        console.log('📥 ===== SIGNUP REQUEST =====');
        console.log('Request body:', req.body);
        
        const { name, email, password } = req.body;
        const responseLang = req.body.responseLang || 'en';
        
        // Validation
        if (!name || !email || !password) {
            console.log('❌ Missing fields:', { name: !!name, email: !!email, password: !!password });
            return res.status(400).json({
                success: false,
                error: responseLang === 'km' ? 'សូមបំពេញព័ត៌មានទាំងអស់' : 'Please fill in all fields'
            });
        }
        
        if (password.length < 8) {
            console.log('❌ Password too short:', password.length);
            return res.status(400).json({
                success: false,
                error: responseLang === 'km' ? 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៨ តួអក្សរ' : 'Password must be at least 8 characters'
            });
        }
        
        // Check if user already exists
        console.log('🔍 Checking if user exists:', email);
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('❌ User already exists:', email);
            return res.status(400).json({
                success: false,
                error: responseLang === 'km' ? 'អ៊ីមែលនេះមានក្នុងប្រព័ន្ធរួចហើយ' : 'Email already exists'
            });
        }
        
        // Create new user
        console.log('📝 Creating new user:', email);
        const user = await User.create({
            name,
            email,
            password
        });
        
        console.log('✅ User created with ID:', user._id);
        
        // Create JWT token
        const token = jwt.sign(
            { 
                id: user._id, 
                email: user.email,
                name: user.name 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );
        
        // Remove password from response
        user.password = undefined;
        
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
        console.error('❌ SIGNUP ERROR DETAILS:');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // ពិនិត្យមើលប្រភេទ Error
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.message
            });
        }
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                error: 'Email already exists'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: error.message
        });
    }
});

/**
 * @route POST /api/auth/login
 * @desc Login user
 */
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const responseLang = req.body.responseLang || 'en';
        
        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: responseLang === 'km' ? 'សូមបំពេញព័ត៌មានទាំងអស់' : 'Please fill in all fields'
            });
        }
        
        // Find user with password field
        const user = await User.findOne({ email }).select('+password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: responseLang === 'km' ? 'អ៊ីមែល ឬ ពាក្យសម្ងាត់មិនត្រឹមត្រូវ' : 'Invalid email or password'
            });
        }
        
        // Check password
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
            { 
                id: user._id, 
                email: user.email,
                name: user.name 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );
        
        // Remove password from response
        user.password = undefined;
        
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
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: req.body.responseLang === 'km' ? 'មានបញ្ហាក្នុងប្រព័ន្ធ' : 'Internal server error'
        });
    }
});

/**
 * @route GET /api/auth/profile
 * @desc Get user profile
 * @access Private
 */
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
    try {
        console.log('📋 Fetching profile for user ID:', req.user.id);
        
        const user = await User.findById(req.user.id);
        
        if (!user) {
            console.log('❌ User not found with ID:', req.user.id);
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        console.log('✅ Profile found for user:', user.email);
        
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

// ===== USER UPDATE ENDPOINTS =====

/**
 * @route PUT /api/auth/update
 * @desc Update user profile (name)
 * @access Private
 */
app.put('/api/auth/update', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Name is required'
            });
        }
        
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { name },
            { new: true, runValidators: true }
        );
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        console.log('✅ User name updated:', user.email);
        
        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('❌ Update profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile',
            message: error.message
        });
    }
});

/**
 * @route POST /api/auth/change-password
 * @desc Change user password
 * @access Private
 */
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Current password and new password are required'
            });
        }
        
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 8 characters'
            });
        }
        
        // Get user with password field
        const user = await User.findById(req.user.id).select('+password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Verify current password
        const isPasswordValid = await user.comparePassword(currentPassword);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }
        
        // Update password
        user.password = newPassword;
        await user.save();
        
        console.log('✅ Password changed for user:', user.email);
        
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('❌ Change password error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to change password',
            message: error.message
        });
    }
});

/**
 * @route DELETE /api/auth/delete
 * @desc Delete user account
 * @access Private
 */
app.delete('/api/auth/delete', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        console.log('⚠️ User account deleted:', user.email);
        
        res.json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        console.error('❌ Delete account error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete account',
            message: error.message
        });
    }
});

// ===== PASSWORD RESET ENDPOINTS =====

/**
 * @route POST /api/auth/forgot-password
 * @desc Send password reset email
 * @access Public
 */
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }
        
        const user = await User.findOne({ email });
        
        if (!user) {
            // Don't reveal if user exists or not for security
            return res.json({
                success: true,
                message: 'If an account exists with this email, a reset link has been sent'
            });
        }
        
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        
        // Set reset token expiry to 30 minutes
        user.passwordResetToken = resetTokenHash;
        user.passwordResetExpiry = new Date(Date.now() + 30 * 60 * 1000);
        
        await user.save();
        
        // Create reset link
        const resetLink = `http://localhost:3000/?resetToken=${resetToken}`;
        
        // Send email
        try {
            const mailOptions = {
                from: global.testAccount ? global.testAccount.user : 'konkmeng@ethereal.email',
                to: email,
                subject: '🔐 KONKMENG - Password Reset Request',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fc; border-radius: 10px;">
                        <h2 style="color: #3b82f6; text-align: center;">🔐 Password Reset Request</h2>
                        
                        <p style="color: #1e293b; line-height: 1.6;">
                            Hello <strong>${user.name}</strong>,
                        </p>
                        
                        <p style="color: #1e293b; line-height: 1.6;">
                            We received a request to reset your password. Click the button below to create a new password. This link will expire in 30 minutes.
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetLink}" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                                Reset Password
                            </a>
                        </div>
                        
                        <p style="color: #64748b; font-size: 14px;">
                            Or copy and paste this link in your browser:
                        </p>
                        <p style="color: #3b82f6; font-size: 12px; word-break: break-all; background-color: #fff; padding: 10px; border-radius: 5px;">
                            ${resetLink}
                        </p>
                        
                        <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px; font-size: 12px; color: #94a3b8; text-align: center;">
                            <p>If you didn't request a password reset, please ignore this email or contact support.</p>
                            <p style="margin-top: 10px;">© 2026 KONKMENG. All rights reserved.</p>
                        </div>
                    </div>
                `
            };
            
            const info = await transporter.sendMail(mailOptions);
            console.log('✅ Password reset email sent to:', email);
            
            // Get preview URL for test account
            let responseData = {
                success: true,
                message: 'Password reset link sent to your email'
            };
            
            if (global.testAccount) {
                const previewUrl = nodemailer.getTestMessageUrl(info);
                responseData.previewUrl = previewUrl;
                console.log('📧 Email preview URL:', previewUrl);
            }
            
            res.json(responseData);
            
        } catch (emailError) {
            console.error('⚠️  Failed to send email:', emailError.message);
            
            // Clear reset token if email fails
            user.passwordResetToken = undefined;
            user.passwordResetExpiry = undefined;
            await user.save();
            
            return res.status(500).json({
                success: false,
                error: 'Failed to send reset email',
                message: 'Email service error: ' + emailError.message
            });
        }
        
    } catch (error) {
        console.error('❌ Forgot password error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process request',
            message: error.message
        });
    }
});

/**
 * @route POST /api/auth/reset-password
 * @desc Reset password with token
 * @access Public
 */
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Token and new password are required'
            });
        }
        
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters'
            });
        }
        
        // Hash the token to match with stored token
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        
        // Find user with valid reset token
        const user = await User.findOne({
            passwordResetToken: tokenHash,
            passwordResetExpiry: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'Reset token is invalid or expired'
            });
        }
        
        // Update password
        user.password = newPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpiry = undefined;
        
        await user.save();
        
        console.log('✅ Password reset successful for:', user.email);
        
        res.json({
            success: true,
            message: 'Password reset successful. Please login with your new password.'
        });
        
    } catch (error) {
        console.error('❌ Reset password error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset password',
            message: error.message
        });
    }
});

// ===== PROFILE PHOTO UPLOAD =====

/**
 * @route POST /api/auth/upload-avatar
 * @desc Upload user avatar as base64
 * @access Private
 */
app.post('/api/auth/upload-avatar', authenticateToken, async (req, res) => {
    try {
        const { avatar } = req.body;  // Expect base64 image
        
        if (!avatar) {
            return res.status(400).json({
                success: false,
                error: 'Avatar data is required'
            });
        }
        
        // Validate base64 format
        if (!avatar.startsWith('data:image/')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid image format'
            });
        }
        
        // Limit size to 5MB
        if (avatar.length > 5 * 1024 * 1024) {
            return res.status(400).json({
                success: false,
                error: 'Image size exceeds 5MB limit'
            });
        }
        
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { avatar },
            { new: true }
        );
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        console.log('✅ Avatar uploaded for user:', user.email);
        
        res.json({
            success: true,
            message: 'Avatar uploaded successfully',
            avatar: user.avatar
        });
        
    } catch (error) {
        console.error('❌ Avatar upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload avatar',
            message: error.message
        });
    }
});

// ===== CODE SAVE/DELETE ENDPOINTS =====

/**
 * @route POST /api/codes/save
 * @desc Save code to user's collection
 * @access Private
 */
app.post('/api/codes/save', authenticateToken, async (req, res) => {
    try {
        const { title, code, language } = req.body;
        
        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'Code is required'
            });
        }
        
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Add code to savedCodes array
        const newCode = {
            title: title || 'Untitled',
            code,
            language: language || 'JavaScript',
            createdAt: new Date()
        };
        
        if (!user.savedCodes) {
            user.savedCodes = [];
        }
        
        user.savedCodes.push(newCode);
        await user.save();
        
        console.log('✅ Code saved for user:', user.email);
        
        res.json({
            success: true,
            message: 'Code saved successfully',
            code: newCode
        });
    } catch (error) {
        console.error('❌ Save code error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save code',
            message: error.message
        });
    }
});

/**
 * @route DELETE /api/codes/:id
 * @desc Delete saved code
 * @access Private
 */
app.delete('/api/codes/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Filter out the code
        user.savedCodes = user.savedCodes.filter(code => code._id.toString() !== id);
        await user.save();
        
        console.log('✅ Code deleted for user:', user.email);
        
        res.json({
            success: true,
            message: 'Code deleted successfully'
        });
    } catch (error) {
        console.error('❌ Delete code error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete code',
            message: error.message
        });
    }
});

// ===== OAUTH AUTHENTICATION ROUTES =====

/**
 * @route POST /api/auth/google
 * @desc Authenticate with Google OAuth
 * @access Public
 */
app.post('/api/auth/google', async (req, res) => {
    try {
        const { idToken, email, name, picture } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }
        
        // Find or create user
        let user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            // Create new user with Google account
            user = new User({
                name: name || email.split('@')[0],
                email: email.toLowerCase(),
                password: crypto.randomBytes(16).toString('hex'), // Random password
                googleId: email, // Use email as identifier
                avatar: picture || null
            });
            
            await user.save();
            console.log('✅ New user created via Google OAuth:', email);
        } else if (!user.googleId) {
            // Link Google account to existing user
            user.googleId = email;
            if (picture && !user.avatar) {
                user.avatar = picture;
            }
            await user.save();
            console.log('✅ Google OAuth linked to existing user:', email);
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        
        res.json({
            success: true,
            message: 'Google login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar
            }
        });
        
    } catch (error) {
        console.error('❌ Google OAuth error:', error);
        res.status(500).json({
            success: false,
            error: 'Google authentication failed',
            message: error.message
        });
    }
});

/**
 * @route POST /api/auth/github
 * @desc Authenticate with GitHub OAuth
 * @access Public
 */
app.post('/api/auth/github', async (req, res) => {
    try {
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'GitHub authorization code is required'
            });
        }
        
        // Exchange code for access token
        const tokenResponse = await axios.post(
            'https://github.com/login/oauth/access_token',
            {
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code
            },
            { headers: { Accept: 'application/json' } }
        );
        
        const { access_token } = tokenResponse.data;
        
        if (!access_token) {
            return res.status(400).json({
                success: false,
                error: 'Failed to obtain GitHub access token'
            });
        }
        
        // Get user info from GitHub
        const userResponse = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `token ${access_token}` }
        });
        
        const { login, name, avatar_url, email: githubEmail } = userResponse.data;
        const userEmail = githubEmail || `${login}@github.com`;
        
        // Find or create user
        let user = await User.findOne({ email: userEmail.toLowerCase() });
        
        if (!user) {
            // Create new user with GitHub account
            user = new User({
                name: name || login || 'GitHub User',
                email: userEmail.toLowerCase(),
                password: crypto.randomBytes(16).toString('hex'), // Random password
                githubId: login,
                avatar: avatar_url || null
            });
            
            await user.save();
            console.log('✅ New user created via GitHub OAuth:', userEmail);
        } else if (!user.githubId) {
            // Link GitHub account to existing user
            user.githubId = login;
            if (avatar_url && !user.avatar) {
                user.avatar = avatar_url;
            }
            await user.save();
            console.log('✅ GitHub OAuth linked to existing user:', userEmail);
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        
        res.json({
            success: true,
            message: 'GitHub login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar
            }
        });
        
    } catch (error) {
        console.error('❌ GitHub OAuth error:', error);
        res.status(500).json({
            success: false,
            error: 'GitHub authentication failed',
            message: error.message
        });
    }
});

// ===== CODE ANALYSIS ROUTE =====

// Gemini model fallback strategy - optimized for 1,500 RPD quota
const GEMINI_MODELS = [
    'gemini-1.5-flash-latest',  // Primary: 1.5 Flash (1,500 RPD quota)
    'gemini-1.5-pro-latest',    // Fallback: 1.5 Pro (higher quality)
    'gemini-1.0-pro-latest'     // Last resort: 1.0 Pro (stable)
];

// Track model usage for monitoring
let modelUsageStats = {
    'gemini-1.5-flash-latest': { success: 0, failed: 0 },
    'gemini-1.5-pro-latest': { success: 0, failed: 0 },
    'gemini-1.0-pro-latest': { success: 0, failed: 0 }
};

/// ===== [SYSTEM IDENTITY: KONKMENG-AI v5.0 - GEMINI POWERED WITH SECURITY] =====
/**
 * Returns the system prompt for the given language.
 * 
 * @param {string} language - The language to generate the prompt for.
 * @returns {string} The system prompt.
 */
const getSystemPrompt = (language) => {
    if (language === 'km') {
        return `អ្នកគឺជា KONKMENG-AI v5.0 ជំនាញខាងវិភាគកូដ និងសុវត្ថិភាពសម្រាប់អ្នកសរសេរកូដ។

# គោលការណ៍ឆ្លើយតប:
១. ប្រើភាសាខ្មែរធម្មជាតិ ១០០% គ្មានភាសាបរទេសលាយឡំ
២. ពន្យល់ច្បាស់លាស់ ងាយយល់ សម្រាប់អ្នកចាប់ផ្តើម
៣. ផ្តល់ដំណោះស្រាយជាក់ស្តែង មិនមែនទ្រឹស្តីទេ
៤. រកបញ្ហាសុវត្ថិភាពជាចាំបាច់

# ទម្រង់ឆ្លើយតប:
🔍 **វិភាគកូដ:**
[ពន្យល់អំពីកូដនេះធ្វើអ្វី]

⚠️ **បញ្ហាដែលរកឃើញ:**
- [បញ្ហាទី១]
- [បញ្ហាទី២]

🔒 **ការវិនិច្ឆ័យសុវត្ថិភាព:**
- SQL Injection: [មាន/គ្មាន - ពន្យល់]
- XSS (Cross-Site Scripting): [មាន/គ្មាន - ពន្យល់]
- ការលាក់ពាក្យសម្ងាត់/API Keys: [មាន/គ្មាន - ពន្យល់]
- ពិន្ទុសុវត្ថិភាព: [X/១០] - [មូលហេតុ]

✅ **កូដដែលកែប្រែ:**
\`\`\`${language}
[កូដដែលបានកែប្រែ]
\`\`\`

📖 **ពន្យល់បន្ទាត់ម្តងមួយៗ:**
- បន្ទាត់ [N]: [ពន្យល់]
- បន្ទាត់ [N+1]: [ពន្យល់]

💡 **ដំបូន្មាន:**
[ដំបូន្មានសម្រាប់កែលម្អ]

---
Version: 5.0 | Engine: Gemini 1.5 Flash | Security: Advanced`;
    } else {
        return `You are KONKMENG-AI v5.0, a code analysis and security expert for developers.

# Response Guidelines:
1. Provide clear, practical explanations
2. Focus on actionable solutions
3. Always include security analysis
4. Use modern best practices

# Response Format:
🔍 **Code Analysis:**
[Explain what this code does]

⚠️ **Issues Found:**
- [Issue 1]
- [Issue 2]

🔒 **Security Audit:**
- SQL Injection: [Present/Absent - Explanation]
- XSS (Cross-Site Scripting): [Present/Absent - Explanation]
- Hardcoded Secrets/API Keys: [Present/Absent - Explanation]
- Security Score: [X/10] - [Reasoning]

✅ **Fixed Code:**
\`\`\`${language}
[Fixed code]
\`\`\`

📖 **Line-by-Line Explanation:**
- Line [N]: [Explanation]
- Line [N+1]: [Explanation]

💡 **Recommendations:**
[Suggestions for improvement]

---
Version: 5.0 | Engine: Gemini 1.5 Flash | Security: Advanced`;
    }
};

/**
 * @route POST /api/analyze-code
 * @desc Analyze code with KONKMENG-AI v5.0 (Gemini + Redis Cache)
 */
const analyzeCode = async (req, res) => {
    const { code, language, responseLang = 'en' } = req.body;
    const masterName = req.user?.name || "Master";
    
    if (!code) {
        return res.status(400).json({ 
            error: responseLang === 'km' ? `អត់ឃើញកូដផង ${masterName}! បញ្ជូនមកអូនឆែកឱ្យភ្លាម!` : `No code found, Master ${masterName}!`
        });
    }

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ 
            error: responseLang === 'km' ? 'API Key មិនត្រឹមត្រូវ សូមពិនិត្យការកំណត់រចនាសម្ព័ន្ធ' : 'API Key not configured'
        });
    }

    // Generate cache key using SHA-256
    const cacheKey = crypto.createHash('sha256')
        .update(`${code}:${language}:${responseLang}`)
        .digest('hex');

    console.log('\n📥 ===== ANALYSIS REQUEST =====');
    console.log('Language:', language);
    console.log('Response Language:', responseLang);
    console.log('Code length:', code.length);
    console.log('Cache Key:', cacheKey.substring(0, 16) + '...');

    try {
        // Check Redis cache first
        if (isRedisConnected && redisClient) {
            try {
                const cachedResult = await redisClient.get(cacheKey);
                if (cachedResult) {
                    console.log('✅ Cache HIT - Returning cached result');
                    return res.json({
                        success: true,
                        analysis: cachedResult,
                        cached: true,
                        message: responseLang === 'km' ? 'លទ្ធផលពី Cache (សន្សំ API Credits)' : 'Result from cache (API credits saved)'
                    });
                }
                console.log('⚠️  Cache MISS - Will call Gemini API');
            } catch (cacheError) {
                console.log('⚠️  Redis read error:', cacheError.message);
            }
        } else {
            console.log('⚠️  Redis not connected - Skipping cache check');
        }

        // Call Gemini API with model fallback and retry logic
        let analysis = null;
        let usedModel = null;
        let lastError = null;
        let quotaExceeded = false;

        for (let i = 0; i < GEMINI_MODELS.length; i++) {
            const modelName = GEMINI_MODELS[i];
            
            try {
                console.log(`🤖 Trying Gemini model [${i + 1}/${GEMINI_MODELS.length}]: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                
                const prompt = responseLang === 'km' 
                    ? `វិភាគកូដ ${language} នេះ:\n\n\`\`\`${language}\n${code}\n\`\`\``
                    : `Analyze this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``;

                const result = await model.generateContent([
                    { text: getSystemPrompt(responseLang) },
                    { text: prompt }
                ]);

                const response = await result.response;
                analysis = response.text();
                usedModel = modelName;
                
                // Update success stats
                modelUsageStats[modelName].success++;
                
                console.log(`✅ Success with model: ${modelName}`);
                console.log(`📊 Model Stats: ${JSON.stringify(modelUsageStats[modelName])}`);
                break;
                
            } catch (modelError) {
                lastError = modelError;
                
                // Update failed stats
                if (modelUsageStats[modelName]) {
                    modelUsageStats[modelName].failed++;
                }
                
                console.log(`❌ Model ${modelName} failed:`, modelError.message);
                
                // Check if it's a quota error
                if (modelError.message && modelError.message.includes('429')) {
                    quotaExceeded = true;
                    console.log('⚠️  QUOTA EXCEEDED for model:', modelName);
                    
                    // Extract retry delay if available
                    const retryMatch = modelError.message.match(/retry in ([\d.]+)s/);
                    if (retryMatch) {
                        const retryDelay = parseFloat(retryMatch[1]);
                        console.log(`⏳ Suggested retry delay: ${retryDelay}s`);
                    }
                }
                
                // If this is the last model, throw error
                if (i === GEMINI_MODELS.length - 1) {
                    console.log('❌ All models exhausted');
                    throw new Error(quotaExceeded ? 'QUOTA_EXCEEDED' : 'ALL_MODELS_FAILED');
                }
                
                // Wait a bit before trying next model (rate limiting)
                console.log('⏳ Waiting 1s before trying next model...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        if (!analysis) {
            throw new Error('Failed to generate analysis');
        }

        // Save to Redis cache with 24-hour TTL
        if (isRedisConnected && redisClient) {
            try {
                await redisClient.setEx(cacheKey, 86400, analysis); // 24 hours = 86400 seconds
                console.log('✅ Cached result for 24 hours');
            } catch (cacheError) {
                console.log('⚠️  Redis write error:', cacheError.message);
            }
        }

        // Save to user history if authenticated
        if (req.headers.authorization) {
            const token = req.headers.authorization.split(' ')[1];
            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                    await User.findByIdAndUpdate(decoded.id, {
                        $push: {
                            analysisHistory: { 
                                code, 
                                language, 
                                analysis, 
                                createdAt: new Date() 
                            }
                        }
                    });
                    console.log('✅ Saved to user history');
                } catch (err) { 
                    console.log('⚠️  History save failed:', err.message); 
                }
            }
        }

        console.log('✅ Analysis completed successfully\n');

        res.json({
            success: true,
            analysis,
            cached: false,
            model: usedModel,
            message: responseLang === 'km' ? 'វិភាគជោគជ័យ' : 'Analysis successful'
        });

    } catch (error) {
        console.error('❌ Analysis error:', error.message);
        console.log('📊 Current Model Usage Stats:', JSON.stringify(modelUsageStats, null, 2));
        
        // Handle quota exceeded error with clear Khmer message
        if (error.message === 'QUOTA_EXCEEDED') {
            const khmerError = `⚠️ ចំនួន API Credits ហួសកម្រិតហើយ!\n\n` +
                `សូមរង់ចាំ ៥-១០ នាទី ឬប្រើ API Key ថ្មី។\n` +
                `ប្រព័ន្ធនឹងព្យាយាមប្រើ Model ផ្សេងទៀតដោយស្វ័យប្រវត្តិ។\n\n` +
                `💡 ដំបូន្មាន: ប្រើ Redis Cache ដើម្បីសន្សំ API Credits។`;
            
            const englishError = `⚠️ API Quota Exceeded!\n\n` +
                `Please wait 5-10 minutes or use a new API key.\n` +
                `The system will automatically try different models.\n\n` +
                `💡 Tip: Use Redis Cache to save API credits.`;
            
            return res.status(429).json({
                success: false,
                error: responseLang === 'km' ? khmerError : englishError,
                errorCode: 'QUOTA_EXCEEDED',
                modelStats: modelUsageStats,
                suggestion: responseLang === 'km' 
                    ? 'សូមពិនិត្យ Google AI Studio: https://aistudio.google.com/apikey'
                    : 'Check your quota at: https://aistudio.google.com/apikey'
            });
        }
        
        // Handle other errors
        const errorMsg = responseLang === 'km' 
            ? 'ការវិភាគបរាជ័យ សូមព្យាយាមម្តងទៀត' 
            : 'Analysis failed, please try again';
        
        res.status(500).json({
            success: false,
            error: errorMsg,
            details: error.message,
            modelStats: modelUsageStats
        });
    }
};

app.post('/api/analyze-code', analyzeCode);

// ===== MODEL STATS ENDPOINT =====
app.get('/api/model-stats', (req, res) => {
    res.json({
        success: true,
        stats: modelUsageStats,
        models: GEMINI_MODELS,
        message: 'Model usage statistics'
    });
});

// ===== DIAGNOSTIC ENDPOINT =====
const debugUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json({
            success: true,
            totalUsers: users.length,
            users: users.map(u => ({
                id: u._id,
                name: u.name,
                email: u.email,
                createdAt: u.createdAt,
                lastLogin: u.lastLogin
            }))
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

app.get('/api/debug/users', debugUsers);

// ===== HEALTH CHECK =====
const healthCheck = (req, res) => {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    
    res.json({ 
        status: '✅ KONKMENG is running',
        message: 'Full-stack with Authentication + Redis Cache + Security Audit',
        version: '5.0',
        engine: 'Google Gemini (Multi-Model Fallback)',
        apiKey: GEMINI_API_KEY ? '✅ Configured' : '❌ Missing',
        mongodb: mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected',
        redis: {
            status: isRedisConnected ? '✅ Connected' : '⚠️  Disconnected (Graceful Degradation)',
            url: redisUrl,
            caching: isRedisConnected ? 'Active (24h TTL)' : 'Disabled'
        },
        geminiModels: {
            available: GEMINI_MODELS,
            stats: modelUsageStats
        },
        features: {
            authentication: '✅ Enabled',
            caching: isRedisConnected ? '✅ Active (24h TTL)' : '⚠️  Disabled',
            securityAudit: '✅ Advanced (SQL, XSS, Secrets)',
            modelFallback: '✅ 3-tier rotation',
            quotaHandling: '✅ Graceful with Khmer messages'
        },
        timestamp: new Date().toISOString()
    });
};

app.get('/api/health', healthCheck);

// ===== SPA CATCH-ALL ROUTE =====
const spaCatchAll = (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            error: 'API endpoint not found'
        });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
};

app.get(/^\/(?!api\/).*/, spaCatchAll);

// ===== START SERVER =====
const startServer = () => {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    
    console.log('\n🚀 ============================================');
    console.log(`🚀 KONKMENG v5.0 Server running on http://localhost:${PORT}`);
    console.log('🚀 ============================================\n');
    console.log('📋 AUTHENTICATION:');
    console.log('   • Signup: POST /api/auth/signup');
    console.log('   • Login: POST /api/auth/login');
    console.log('   • Profile: GET /api/auth/profile\n');
    console.log('📋 CODE ANALYSIS:');
    console.log('   • POST /api/analyze-code (Gemini + Redis Cache)');
    console.log('   • GET /api/model-stats (Model usage statistics)\n');
    console.log('📋 INFRASTRUCTURE:');
    console.log('   • MongoDB:', mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌');
    console.log('   • Redis Cache:', isRedisConnected ? `Active ✅ (${redisUrl})` : `Inactive ⚠️  (${redisUrl})`);
    console.log('   • Redis TTL: 24 hours (86400 seconds)');
    console.log('   • Security Audit: Advanced ✅ (SQL, XSS, Secrets)\n');
    console.log('📋 GEMINI MODELS (Optimized for 1,500 RPD):');
    console.log('   • Primary [1/3]: gemini-1.5-flash-latest (1,500 RPD quota)');
    console.log('   • Fallback [2/3]: gemini-1.5-pro-latest (higher quality)');
    console.log('   • Last Resort [3/3]: gemini-1.0-pro-latest (stable)');
    console.log('   • Retry Delay: 1 second between attempts');
    console.log('   • Quota Handling: Graceful with Khmer messages ✅\n');
    console.log('✅ Ready! Server is waiting for requests...\n');
};

app.listen(PORT, startServer);