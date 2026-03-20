const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const redis = require('redis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
const corsOptions = {
    origin: function (origin, callback) {
        // អនុញ្ញាតគ្រប់ origin ទាំងអស់ (រួមទាំងទូរស័ព្ទ និងកុំព្យូទ័រផ្សេង)
        callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Handle preflight requests for all routes


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
        redisClient = redis.createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
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
            console.log('✅ Redis connected successfully');
            isRedisConnected = true;
        });

        redisClient.on('ready', () => {
            console.log('✅ Redis ready to use');
            isRedisConnected = true;
        });

        await redisClient.connect();
    } catch (error) {
        console.log('⚠️  Redis connection failed:', error.message);
        console.log('⚠️  Server will continue without caching');
        isRedisConnected = false;
    }
}

// Initialize Redis
setupRedis();

console.log('\n🔍 ===== KONKMENG AI SYSTEM =====');
console.log('🔑 GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('🔑 MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('🔑 JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('📧 EMAIL_SERVICE: Ethereal Email (Test/Development)');
console.log('💾 REDIS_CACHE: Initializing...');
console.log('🔑 PORT:', PORT);
console.log('================================\n');

// ===== DATABASE CONNECTION =====
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/konkmen')
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => {
    console.error('⚠️  MongoDB connection error:', err.message);
    console.log('⚠️  Server will continue without database features');
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
        
        // Create reset link - Use environment URL or request origin
        const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
        const resetLink = `${baseUrl}/?resetToken=${resetToken}`;
        
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

// GOOGLE GEMINI API CONFIGURATION
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// System prompts optimized for Khmer language
// System prompts optimized for Khmer language with Security Audit
const getSystemPrompt = (language) => {
    if (language === 'km') {
        return `អ្នកគឺជាគ្រូបង្រៀនសរសេរកម្មវិធីជំនាញខ្ពស់ដែលឆ្លើយតែជាភាសាខ្មែរប្រើប្រាស់ពាក្យសាមញ្ញ និងងាយយល់។

🎯 **គោលការណ៍សំខាន់:**
- ឆ្លើយជាភាសាខ្មែរ ១០០% ប្រើពាក្យធម្មតាដែលមនុស្សខ្មែរប្រើប្រចាំថ្ងៃ
- ពន្យល់ច្បាស់លាស់ សាមញ្ញ និងងាយយល់សម្រាប់អ្នកចាប់ផ្តើម
- ប្រើឧទាហរណ៍ជាក់ស្តែងនៅពេលចាំបាច់
- កុំប្រើពាក្យបច្ចេកទេសច្រើនពេក ប្រសិនបើប្រើត្រូវពន្យល់ជាភាសាសាមញ្ញ
- ត្រូវពិនិត្យសុវត្ថិភាពកូដជានិច្ច

📋 **ទម្រង់ចម្លើយ:**

📝 **កូដដែលត្រូវពិនិត្យ:**
*បន្ទាត់ទី [លេខ]: [បង្ហាញកូដដើម]

🔧 **បញ្ហាដែលរកឃើញ:**
- [ពន្យល់បញ្ហាជាភាសាខ្មែរសាមញ្ញ]

🔒 **ការត្រួតពិនិត្យសុវត្ថិភាព:**
- **SQL Injection:** [ពិនិត្យមើលថាតើមានហានិភ័យ SQL Injection ឬទេ]
- **XSS (Cross-Site Scripting):** [ពិនិត្យមើលថាតើមានហានិភ័យ XSS ឬទេ]
- **ពាក្យសម្ងាត់ដាក់ក្នុងកូដ:** [ពិនិត្យមើលថាតើមាន API keys, passwords ក្នុងកូដឬទេ]
- **ចំណុចសុវត្ថិភាពផ្សេងៗ:** [បញ្ហាសុវត្ថិភាពផ្សេងទៀត]
- **ពិន្ទុសុវត្ថិភាព:** [ពិន្ទុ]/១០ ([ពន្យល់ហេតុផល])

✅ **កូដដែលបានកែប្រែ:**
\`\`\`[language]
[កូដថ្មីដែលត្រឹមត្រូវ និងមានសុវត្ថិភាព]
\`\`\`

📖 **ការពន្យល់លម្អិត:**
*បន្ទាត់ទី [លេខ]: [ពន្យល់ជាភាសាខ្មែរងាយយល់ថាកូដនេះធ្វើអ្វី និងហេតុអ្វីត្រូវកែ]

💡 **ចំណេះដឹងបន្ថែម:**
[ផ្តល់ព័ត៌មានបន្ថែមដែលមានប្រយោជន៍ជាភាសាខ្មែរ]`;
    } else {
        return `You are an expert programming teacher providing clear, simple explanations in English.

🎯 **Key Principles:**
- Respond 100% in English using simple, everyday language
- Provide clear, concise explanations suitable for beginners
- Use practical examples when necessary
- Avoid excessive technical jargon; if used, explain in simple terms
- Always perform security audits on code

📋 **RESPONSE FORMAT:**

📝 **Code to Review:**
*Line [number]: [show original code]

🔧 **Issues Found:**
- [brief explanation in simple English]

🔒 **Security Audit:**
- **SQL Injection:** [check for SQL injection vulnerabilities]
- **XSS (Cross-Site Scripting):** [check for XSS vulnerabilities]
- **Hardcoded Secrets:** [check for API keys, passwords, tokens in code]
- **Other Security Issues:** [any other security concerns]
- **Security Score:** [score]/10 ([brief explanation])

✅ **Fixed Code:**
\`\`\`[language]
[corrected and secure code]
\`\`\`

📖 **Detailed Explanation:**
*Line [number]: [explain in simple English what this code does and why it was changed]

💡 **Additional Tips:**
[provide helpful additional information in English]`;
    }
}

/**
 * @route POST /api/analyze-code
 * @desc Analyze code with Google Gemini AI
 */
app.post('/api/analyze-code', async (req, res) => {
    try {
        const { code, language, responseLang = 'en' } = req.body;
        
        console.log('\n📥 ===== ANALYSIS REQUEST =====');
        console.log('Language:', language);
        console.log('Response Language:', responseLang);
        console.log('Code length:', code?.length || 0);

        // Validation
        if (!code) {
            return res.status(400).json({ 
                error: responseLang === 'km' ? 'សូមបញ្ចូលកូដ' : 'Please enter code'
            });
        }

        if (!GEMINI_API_KEY || !genAI) {
            return res.status(500).json({ 
                error: responseLang === 'km' ? 'API Key មិនត្រឹមត្រូវ' : 'API Key not configured'
            });
        }

        // ===== REDIS CACHING =====
        // Create cache key from code + language + responseLang
        const cacheKey = crypto
            .createHash('sha256')
            .update(`${code}:${language}:${responseLang}`)
            .digest('hex');

        // Check Redis cache first
        if (isRedisConnected && redisClient) {
            try {
                const cachedResult = await redisClient.get(`analysis:${cacheKey}`);
                if (cachedResult) {
                    console.log('✅ Cache HIT - Returning cached result');
                    const parsed = JSON.parse(cachedResult);
                    return res.json({
                        ...parsed,
                        cached: true,
                        cacheKey: cacheKey.substring(0, 8) + '...'
                    });
                }
                console.log('⚠️  Cache MISS - Calling Gemini API');
            } catch (cacheError) {
                console.log('⚠️  Cache read error:', cacheError.message);
            }
        }

        // Try Gemini models in order (trying paid tier models which might work)
        const modelsToTry = [
            { name: 'gemini-2.5-flash', type: 'Fast' },
            { name: 'gemini-2.0-flash-lite-001', type: 'Lite' },
            { name: 'gemini-2.0-flash', type: 'Standard' }
        ];

        let lastError = null;
        let successResponse = null;

        for (const modelInfo of modelsToTry) {
            try {
                console.log(`🤔 Trying ${modelInfo.name}...`);

                const model = genAI.getGenerativeModel({ 
                    model: modelInfo.name,
                    generationConfig: {
                        temperature: 0.3,
                        topP: 0.85,
                        topK: 40,
                        maxOutputTokens: 2048,
                    }
                });

                const systemPrompt = getSystemPrompt(responseLang);
                
                const userPrompt = responseLang === 'km' 
                    ? `ពន្យល់កូដ ${language} នេះជាភាសាខ្មែរសាមញ្ញ និងងាយយល់ ហើយត្រូវពិនិត្យសុវត្ថិភាពផងដែរ៖

\`\`\`${language}
${code}
\`\`\`

សូមឆ្លើយតាមទម្រង់ដែលបានកំណត់ ហើយប្រើតែភាសាខ្មែរប៉ុណ្ណោះ។ ត្រូវរួមបញ្ចូលផ្នែក "ការត្រួតពិនិត្យសុវត្ថិភាព" ជាមួយពិន្ទុសុវត្ថិភាព។`
                    : `Explain this ${language} code in simple English and perform a security audit:

\`\`\`${language}
${code}
\`\`\`

Please follow the response format and use only English. Must include "Security Audit" section with security score.`;

                const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
                
                const result = await model.generateContent(fullPrompt);
                const response = await result.response;
                const text = response.text();

                if (text) {
                    console.log(`✅ Success with ${modelInfo.name}`);
                    successResponse = text;
                    
                    // Save to user history if authenticated
                    const authHeader = req.headers['authorization'];
                    const token = authHeader && authHeader.split(' ')[1];
                    
                    if (token) {
                        try {
                            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                            await User.findByIdAndUpdate(decoded.id, {
                                $push: {
                                    analysisHistory: {
                                        code,
                                        language,
                                        analysis: successResponse,
                                        createdAt: new Date()
                                    }
                                }
                            });
                            console.log('✅ Analysis saved to user history');
                        } catch (err) {
                            console.log('⚠️ Could not save to history:', err.message);
                        }
                    }
                    
                    break;
                }

            } catch (error) {
                console.log(`❌ ${modelInfo.name} failed:`, error.message);
                lastError = error;
            }
        }

        if (successResponse) {
            const responseData = {
                success: true,
                analysis: successResponse,
                responseLanguage: responseLang,
                status: responseLang === 'km' ? 'វិភាគរួចរាល់' : 'Analysis complete',
                cached: false
            };

            // ===== SAVE TO REDIS CACHE =====
            if (isRedisConnected && redisClient) {
                try {
                    // Cache for 24 hours (86400 seconds)
                    await redisClient.setEx(
                        `analysis:${cacheKey}`,
                        86400,
                        JSON.stringify(responseData)
                    );
                    console.log('✅ Result cached for 24 hours');
                } catch (cacheError) {
                    console.log('⚠️  Cache write error:', cacheError.message);
                }
            }

            return res.json(responseData);
        }

        throw lastError || new Error('All models failed');

    } catch (error) {
        console.error('\n❌ ANALYSIS ERROR:', error.message);
        
        const responseLang = req.body?.responseLang || 'en';
        
        res.status(500).json({
            error: responseLang === 'km' ? 'ការវិភាគបរាជ័យ' : 'Analysis failed',
            details: error.message,
            solution: responseLang === 'km' ? 'សូមព្យាយាមម្តងទៀត' : 'Please try again'
        });
    }
});

// ===== DIAGNOSTIC ENDPOINT =====
/**
 * @route GET /api/debug/users
 * @desc Get all users in database (FOR TESTING ONLY)
 */
app.get('/api/debug/users', async (req, res) => {
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
});

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
    res.json({ 
        status: '✅ KONKMENG is running',
        message: 'Full-stack with Authentication',
        version: '5.0 (with Gemini AI + Redis Cache + Security Audit)',
        apiKey: GEMINI_API_KEY ? '✅ Configured' : '❌ Missing',
        mongodb: mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected',
        redis: isRedisConnected ? '✅ Connected' : '❌ Disconnected',
        timestamp: new Date().toISOString()
    });
});

// ===== START SERVER =====
app.listen(PORT, () => {
    console.log('\n🚀 ============================================');
    console.log(`🚀 KONKMENG Server running on http://localhost:${PORT}`);
    console.log('🚀 ============================================\n');
    console.log('📋 AUTHENTICATION:');
    console.log('   • Signup: POST /api/auth/signup');
    console.log('   • Login: POST /api/auth/login');
    console.log('   • Profile: GET /api/auth/profile\n');
    console.log('📋 CODE ANALYSIS:');
    console.log('   • POST /api/analyze-code (with optional token)\n');
    console.log('📋 DATABASE:');
    console.log('   • MongoDB:', mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌');
    console.log('   • Users collection: ready\n');
    console.log('✅ Ready! Server is waiting for requests...\n');
});
