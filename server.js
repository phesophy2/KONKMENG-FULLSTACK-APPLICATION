const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const path = require('path');
const Groq = require('groq-sdk');
const redis = require('redis');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://konkmeng.onrender.com', 'https://www.konkmeng.com']
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));                    
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

// ===== GROQ API CONFIGURATION =====
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Groq usage stats
let groqUsageStats = {
    success: 0,
    failed: 0,
    totalTokens: 0,
    lastUsed: null
};

console.log('\n🔍 ===== KONKMENG AI SYSTEM v5.1 | Groq Edition =====');
console.log('🔑 GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);
console.log('🔑 MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('🔑 JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('📧 EMAIL_SERVICE: Ethereal Email (Test/Development)');
console.log('💾 REDIS_CACHE: Initializing...');
console.log('🤖 AI_ENGINE: Groq (Llama 3.3 70B Versatile)');
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

// Reset stats every 24 hours
const STATS_RESET_INTERVAL = 24 * 60 * 60 * 1000;
setInterval(() => {
    groqUsageStats = { success: 0, failed: 0, totalTokens: 0, lastUsed: null };
    console.log('📊 Groq stats reset');
}, STATS_RESET_INTERVAL);

/// ===== [SYSTEM IDENTITY: KONKMENG-AI v5.1 | Groq Edition - MINIMALIST CODE EXPLAINER] =====
/**
 * Convert language name to proper markdown language tag
 * @param {string} language - The language name (e.g., "JavaScript", "Python")
 * @returns {string} The markdown language tag (e.g., "javascript", "python")
 */
const getLanguageTag = (language) => {
    const languageMap = {
        'JavaScript': 'javascript',
        'TypeScript': 'typescript',
        'Python': 'python',
        'Java': 'java',
        'C++': 'cpp',
        'C#': 'csharp',
        'C': 'c',
        'PHP': 'php',
        'Ruby': 'ruby',
        'Go': 'go',
        'Rust': 'rust',
        'Swift': 'swift',
        'Kotlin': 'kotlin',
        'SQL': 'sql',
        'HTML': 'html',
        'CSS': 'css',
        'JSON': 'json',
        'XML': 'xml',
        'YAML': 'yaml',
        'Markdown': 'markdown',
        'Shell': 'bash',
        'Bash': 'bash',
        'PowerShell': 'powershell',
        'R': 'r',
        'Scala': 'scala',
        'Perl': 'perl',
        'Lua': 'lua',
        'Dart': 'dart',
        'Objective-C': 'objectivec'
    };
    
    return languageMap[language] || language.toLowerCase();
};

/**
 * Returns the system prompt for the given language.
 * 
 * @param {string} language - The language to generate the prompt for.
 * @returns {string} The system prompt.
 */
const getSystemPrompt = (language) => {
    const langTag = getLanguageTag(language);
    if (language === 'km') {
        return `អ្នកគឺជា KONKMENG AI v5.1 - AI ជំនាញពន្យល់កូដដ៏ឆ្លាតវៃ។

📋 **ទម្រង់ឆ្លើយតប (ប្រើ Markdown styling):**

┌─────────────────────────────────────┐
│ 🎯 **សង្ខេបកូដ**                      │
└─────────────────────────────────────┘
[ពន្យល់សង្ខេបអំពីអ្វីដែលកូដធ្វើ ក្នុង 2-3 ប្រយោគ]

┌─────────────────────────────────────┐
│ 🔍 **វិភាគលម្អិត**                    │
└─────────────────────────────────────┘
[ពន្យល់លម្អិតអំពី logic, algorithm, និង design patterns]

┌─────────────────────────────────────┐
│ ⚠️ **បញ្ហា & ការកែលម្អ**              │
└─────────────────────────────────────┘
${language === 'km' ? '✅ **អ្វីដែលល្អ:**' : '✅ **Good:**'}
• [ចំណុចវិជ្ជមាន]

${language === 'km' ? '⚠️ **អ្វីដែលត្រូវកែ:**' : '⚠️ **Needs Improvement:**'}
• [ចំណុចដែលត្រូវកែលម្អ]

${language === 'km' ? '💡 **ដំបូន្មាន:**' : '💡 **Suggestions:**'}
• [ដំបូន្មានកែលម្អ]

┌─────────────────────────────────────┐
│ 📖 **ពន្យល់បន្ទាត់ម្តងមួយៗ**          │
└─────────────────────────────────────┘
\`\`\`${langTag}
[បង្ហាញកូដដើមជាមួយលេខបន្ទាត់]
\`\`\`

**ការពន្យល់:**
• **បន្ទាត់ 1-X:** [ពន្យល់ក្រុមបន្ទាត់ដែលទាក់ទង]
• **បន្ទាត់ Y:** [ពន្យល់បន្ទាត់សំខាន់]

┌─────────────────────────────────────┐
│ 🎨 **ឧទាហរណ៍ប្រើប្រាស់**              │
└─────────────────────────────────────┘
\`\`\`${langTag}
[បង្ហាញឧទាហរណ៍របៀបប្រើកូដនេះ]
\`\`\`

**Output:**
\`\`\`
[បង្ហាញលទ្ធផលដែលរំពឹងទុក]
\`\`\`

---
💬 **សន្និដ្ឋាន:** [សង្ខេបចុងក្រោយ 1 ប្រយោគ]

**ច្បាប់សំខាន់:**
- ប្រើ emojis ឱ្យច្រើនដើម្បីឱ្យគួរឱ្យចាប់អារម្មណ៍
- ប្រើ boxes (┌─┐ │ └─┘) ដើម្បីបែងចែក sections
- ប្រើ **bold** សម្រាប់ពាក្យសំខាន់
- ប្រើ \`code\` សម្រាប់ code snippets
- ប្រើ bullet points (•) ជំនួស hyphens (-)
- Code blocks ត្រូវតែប្រើ \`\`\`${langTag}\`\`\` (មិនមែន \`\`\`km\`\`\`)`;
    } else {
        return `You are KONKMENG AI v5.1 - An intelligent code explanation AI.

📋 **Response Format (Use Markdown styling):**

┌─────────────────────────────────────┐
│ 🎯 **Code Summary**                  │
└─────────────────────────────────────┘
[Brief 2-3 sentence summary of what the code does]

┌─────────────────────────────────────┐
│ 🔍 **Detailed Analysis**             │
└─────────────────────────────────────┘
[Detailed explanation of logic, algorithms, and design patterns]

┌─────────────────────────────────────┐
│ ⚠️ **Issues & Improvements**         │
└─────────────────────────────────────┘
✅ **Good Points:**
• [Positive aspects]

⚠️ **Needs Improvement:**
• [Areas that need improvement]

💡 **Suggestions:**
• [Improvement recommendations]

┌─────────────────────────────────────┐
│ 📖 **Line-by-Line Breakdown**        │
└─────────────────────────────────────┘
\`\`\`${langTag}
[Show original code with line numbers]
\`\`\`

**Explanation:**
• **Lines 1-X:** [Explain related group of lines]
• **Line Y:** [Explain important line]

┌─────────────────────────────────────┐
│ 🎨 **Usage Example**                 │
└─────────────────────────────────────┘
\`\`\`${langTag}
[Show example of how to use this code]
\`\`\`

**Output:**
\`\`\`
[Show expected output]
\`\`\`

---
💬 **Conclusion:** [Final 1-sentence summary]

**Important Rules:**
- Use plenty of emojis to make it engaging
- Use boxes (┌─┐ │ └─┘) to separate sections
- Use **bold** for important terms
- Use \`code\` for code snippets
- Use bullet points (•) instead of hyphens (-)
- Code blocks must use \`\`\`${langTag}\`\`\` (not other tags)`;
    }
};

/**
 * @route POST /api/analyze-code
 * @desc Analyze code with KONKMENG-AI v5.1 | Groq Edition (Llama 3.3 70B + Redis Cache)
 */
const CACHE_LOCK_TTL = 30; // 30 seconds lock
const MAX_CODE_LENGTH = 50000; // 50KB max

const analyzeCode = async (req, res) => {
    const { code, language, responseLang = 'en' } = req.body;
    const masterName = req.user?.name || "Master";
    
    // Input validation
    if (!code) {
        return res.status(400).json({ 
            error: responseLang === 'km' ? `អត់ឃើញកូដផង ${masterName}! បញ្ជូនមកអូនឆែកឱ្យភ្លាម!` : `No code found, Master ${masterName}!`
        });
    }
    
    if (code.length > MAX_CODE_LENGTH) {
        return res.status(400).json({
            success: false,
            error: responseLang === 'km' 
                ? `កូដវែងពេក! កំណត់អតិបរមា ${MAX_CODE_LENGTH} តួអក្សរ`
                : `Code too long! Maximum ${MAX_CODE_LENGTH} characters`,
            currentLength: code.length,
            maxLength: MAX_CODE_LENGTH
        });
    }

    if (!GROQ_API_KEY || !groq) {
        return res.status(500).json({ 
            error: responseLang === 'km' ? 'API Key មិនត្រឹមត្រូវ សូមពិនិត្យការកំណត់រចនាសម្ព័ន្ធ' : 'Groq API Key not configured'
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
                
                // Try to acquire lock to prevent race condition
                const lockKey = `lock:${cacheKey}`;
                const lockAcquired = await redisClient.set(lockKey, '1', {
                    NX: true,  // Only set if not exists
                    EX: CACHE_LOCK_TTL
                });
                
                if (!lockAcquired) {
                    // Another request is processing, wait and retry
                    console.log('⏳ Another request is processing this code, waiting...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Check cache again after waiting
                    const retryResult = await redisClient.get(cacheKey);
                    if (retryResult) {
                        console.log('✅ Cache HIT after waiting - Returning cached result');
                        return res.json({
                            success: true,
                            analysis: retryResult,
                            cached: true,
                            message: responseLang === 'km' ? 'លទ្ធផលពី Cache (រង់ចាំបន្តិច)' : 'Result from cache (waited)'
                        });
                    }
                    // If still no cache, proceed with API call
                }
                
                console.log('⚠️  Cache MISS - Will call Groq API');
            } catch (cacheError) {
                console.log('⚠️  Redis error:', cacheError.message);
            }
        } else {
            console.log('⚠️  Redis not connected - Skipping cache check');
        }

        // Call Groq API
        let analysis = null;
        let lastError = null;

        try {
            console.log(`🤖 Calling Groq API with model: ${GROQ_MODEL}`);
            
            const prompt = responseLang === 'km' 
                ? `វិភាគកូដ ${language} នេះ:\n\n\`\`\`${language}\n${code}\n\`\`\``
                : `Analyze this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``;

            // Call Groq API with timeout
            const completion = await Promise.race([
                groq.chat.completions.create({
                    messages: [
                        { role: 'system', content: getSystemPrompt(responseLang) },
                        { role: 'user', content: prompt }
                    ],
                    model: GROQ_MODEL,
                    temperature: 0.3,
                    max_tokens: 4096
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Groq API timeout after 30s')), 30000)
                )
            ]);

            analysis = completion.choices[0]?.message?.content;
            
            if (!analysis) {
                throw new Error('Empty response from Groq API');
            }
            
            // Update success stats
            groqUsageStats.success++;
            groqUsageStats.totalTokens += (completion.usage?.total_tokens || 0);
            groqUsageStats.lastUsed = new Date().toISOString();
            
            console.log(`✅ Success with Groq API`);
            console.log(`📊 Tokens used: ${completion.usage?.total_tokens || 0}`);
            console.log(`📊 Groq Stats: ${JSON.stringify(groqUsageStats)}`);
            
        } catch (groqError) {
            lastError = groqError;
            groqUsageStats.failed++;
            
            console.log(`❌ Groq API failed:`, groqError.message);
            throw new Error('GROQ_API_FAILED');
        }

        // Save to Redis cache with 24-hour TTL and release lock
        if (isRedisConnected && redisClient) {
            try {
                await redisClient.setEx(cacheKey, 86400, analysis); // 24 hours = 86400 seconds
                console.log('✅ Cached result for 24 hours');
                
                // Release lock
                const lockKey = `lock:${cacheKey}`;
                await redisClient.del(lockKey);
                console.log('✅ Released cache lock');
            } catch (cacheError) {
                console.log('⚠️  Redis write error:', cacheError.message);
            }
        }

        // Save to user history (fire and forget with proper error handling)
        if (req.headers.authorization) {
            const token = req.headers.authorization.split(' ')[1];
            if (token) {
                jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', async (err, decoded) => {
                    if (err) {
                        console.log('⚠️  JWT verification failed:', err.message);
                        return;
                    }
                    
                    try {
                        await User.findByIdAndUpdate(decoded.id, {
                            $push: {
                                analysisHistory: {
                                    $each: [{
                                        code: code.substring(0, 1000), // Store only first 1KB
                                        language,
                                        analysis: analysis.substring(0, 5000), // Store only first 5KB
                                        createdAt: new Date()
                                    }],
                                    $slice: -50 // Keep only last 50 entries
                                }
                            }
                        }, { 
                            timeout: 5000 // 5 second timeout
                        });
                        console.log('✅ Saved to user history');
                    } catch (historyError) {
                        console.error('❌ History save failed:', historyError.message);
                    }
                });
            }
        }

        console.log('✅ Analysis completed successfully\n');

        res.json({
            success: true,
            analysis,
            cached: false,
            model: GROQ_MODEL,
            message: responseLang === 'km' ? 'វិភាគជោគជ័យ' : 'Analysis successful'
        });

    } catch (error) {
        console.error('❌ Analysis error:', error.message);
        console.log('📊 Current Groq Stats:', JSON.stringify(groqUsageStats, null, 2));
        
        // Release lock on error
        if (isRedisConnected && redisClient) {
            try {
                const lockKey = `lock:${cacheKey}`;
                await redisClient.del(lockKey);
            } catch (e) {
                // Ignore lock cleanup errors
            }
        }
        
        // Handle Groq API error with Khmer message
        const errorMsg = responseLang === 'km' 
            ? 'មានបញ្ហាបច្ចេកទេសជាមួយ Groq API សូមព្យាយាមម្តងទៀត' 
            : 'Technical issue with Groq API, please try again';
        
        res.status(500).json({
            success: false,
            error: errorMsg,
            details: error.message,
            groqStats: groqUsageStats
        });
    }
};

// ===== RATE LIMITING FOR ANALYZE-CODE ENDPOINT =====
const analyzeCodeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per 15 minutes per IP
    message: {
        success: false,
        error: 'ចំនួនសំណើរហួសកម្រិត សូមរង់ចាំ ១៥ នាទី',
        errorEn: 'Too many requests, please wait 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limit for cached responses
    skip: async (req) => {
        if (!req.body.code) return false;
        
        const cacheKey = crypto.createHash('sha256')
            .update(`${req.body.code}:${req.body.language}:${req.body.responseLang || 'en'}`)
            .digest('hex');
        
        if (isRedisConnected && redisClient) {
            try {
                const cached = await redisClient.get(cacheKey);
                return !!cached; // Skip rate limit if cached
            } catch (e) {
                return false;
            }
        }
        return false;
    }
});

app.post('/api/analyze-code', analyzeCodeLimiter, analyzeCode);

// ===== MODEL STATS ENDPOINT =====
app.get('/api/model-stats', (req, res) => {
    res.json({
        success: true,
        stats: groqUsageStats,
        model: GROQ_MODEL,
        message: 'Groq API usage statistics'
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
        message: 'Full-stack with Authentication + Redis Cache',
        version: '5.1 | Groq Edition',
        engine: 'Groq Llama 3.3 70B Versatile | Ultra-Fast Performance',
        apiKey: GROQ_API_KEY ? '✅ Configured' : '❌ Missing',
        mongodb: mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected',
        redis: {
            status: isRedisConnected ? '✅ Connected' : '⚠️  Disconnected (Graceful Degradation)',
            url: redisUrl,
            caching: isRedisConnected ? 'Active (24h TTL)' : 'Disabled'
        },
        groqModel: {
            name: GROQ_MODEL,
            stats: groqUsageStats
        },
        features: {
            authentication: '✅ Enabled',
            caching: isRedisConnected ? '✅ Active (24h TTL)' : '⚠️  Disabled',
            minimalistPrompt: '✅ Enabled (No security scans, no greetings)'
        },
        timestamp: new Date().toISOString()
    });
};

app.get('/api/health', healthCheck);

// ===== SPA CATCH-ALL ROUTE =====
// Serve SPA for all non-API routes
app.use((req, res, next) => {
    // Skip if it's an API route
    if (req.path.startsWith('/api')) {
        return next();
    }
    
    // Serve SPA for all other routes
    res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
        if (err) {
            console.error('Error serving index.html:', err);
            res.status(500).send('Internal Server Error');
        }
    });
});

// 404 handler for API routes (must be AFTER all API routes)
app.use((req, res, next) => {
    // Only handle API routes that weren't matched
    if (req.path.startsWith('/api')) {
        return res.status(404).json({
            success: false,
            error: 'API endpoint not found',
            path: req.path
        });
    }
    next();
});

// ===== START SERVER =====
const startServer = () => {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    
    console.log('\n🚀 ============================================');
    console.log(`🚀 KONKMENG v5.1 | Groq Edition running on http://localhost:${PORT}`);
    console.log('🚀 ============================================\n');
    console.log('📋 AUTHENTICATION:');
    console.log('   • Signup: POST /api/auth/signup');
    console.log('   • Login: POST /api/auth/login');
    console.log('   • Profile: GET /api/auth/profile\n');
    console.log('📋 CODE ANALYSIS:');
    console.log('   • POST /api/analyze-code (Groq + Redis Cache)');
    console.log('   • GET /api/model-stats (Groq usage statistics)\n');
    console.log('📋 INFRASTRUCTURE:');
    console.log('   • MongoDB:', mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌');
    console.log('   • Redis Cache:', isRedisConnected ? `Active ✅ (${redisUrl})` : `Inactive ⚠️  (${redisUrl})`);
    console.log('   • Redis TTL: 24 hours (86400 seconds)\n');
    console.log('📋 GROQ MODEL:');
    console.log('   • Model: llama-3.3-70b-versatile');
    console.log('   • Context: 128K tokens');
    console.log('   • Speed: Ultra-fast inference');
    console.log('   • Languages: English + Khmer support ✅\n');
    console.log('✅ Ready! Server is waiting for requests...\n');
};

app.listen(PORT, startServer);