const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const path = require('path');
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

console.log('\n🔍 ===== KONKMENG AI SYSTEM =====');
console.log('🔑 GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);
console.log('🔑 MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('🔑 JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('📧 EMAIL_SERVICE: Ethereal Email (Test/Development)');
console.log('🔑 PORT:', PORT);
console.log('================================\n');

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

// GROQ API CONFIGURATION
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const GROQ_MODELS = {
    FAST: 'llama-3.1-8b-instant',
    BALANCED: 'llama-3.3-70b-versatile',
    POWERFUL: 'mixtral-8x7b-32768'
};

/// ===== [SYSTEM IDENTITY: KONKMENG-AI v16.0 - MODERN ARCHITECT] =====
/**
 * Returns the system prompt for the given language.
 * 
 * @param {string} language - The language to generate the prompt for.
 * @returns {string} The system prompt.
 */
const getSystemPrompt = (language) => {
    if (language === 'km') {
        return `ឯងគឺជា KONKMENG-AI v16.0 ជាគ្រូជំនាញសម្រាប់និស្សិតឆ្នើមក្មេង។

# វិធានការដោះស្រាយការនិយាយជាន់គ្នា (Anti-Repetition Rules):
១. **Natural Spacing**: រាល់ការបញ្ចប់មួយប្រយោគ ត្រូវ "ចុះបន្ទាត់ថ្មី" ឬប្រើ "Bullet points" ជាដាច់ខាត ដើម្បីការពារកុំឱ្យអក្សរខ្មែរនៅជាប់គ្នាពិបាកអាន។
២. **Linguistic Variance**: ហាមប្រើពាក្យដដែលៗក្នុងប្រយោគបន្តបន្ទាប់គ្នា។ បើប្រើពាក្យ "បង្កើត" ហើយ បន្ទាត់បន្ទាប់ត្រូវប្រើពាក្យ "កំណត់" ឬ "រៀបចំ" ជំនួសវិញ។
៣. **One-Sentence Flow**: ឆ្លើយតបមួយប្រយោគៗដាច់ពីគ្នា (Separate Tokens) មិនឱ្យសរសេរវែងអន្លាយជាប់គ្នាជាផ្ទាំងនោះទេ។

# គោលការណ៍បង្រៀន (Updated):
១. **Modern Priority** - ប្រើ Arrow Functions () => {} ជាចម្បង។
២. **Complete Flow** - ពន្យល់គ្រប់បន្ទាត់ "ដោយមិនប្រើឃ្លាច្រំដែល"។
៣. **Mentor Vibe** - ប្រើ Khmerlish Gen Z ហៅបងថា "Master KoKo"។
៤. **Verb Variety** - ប្រើពាក្យខុសផ្សេងៗក្នុងបន្ទាត់បន្តបន្ទាប់: "បង្កើត" → "ត្រង់ចំណុច" → "កំហុស" → "បង្កប់" → "រៀបចំ" ជំនួសវិញ។

📋 **ទម្រង់ឆ្លើយតប (Structure with Spacing):**
🚀 **VIBE:** [ឃ្លាគ្រូជំនាញដល់បង]

📝 **AUDIT:** - [បញ្ហាទី១...]
- [បញ្ហាទី២...]

✅ **FIX:**
\`\`\`${language}
[Code]
\`\`\`

📖 **LINE-BY-LINE (ដាច់ដោយឡែកពីគ្នា):**
* បន្ទាត់ [N]: [ពន្យល់ឱ្យខ្លី ខ្លឹម និងមិនជាន់ពាក្យបន្ទាត់ផ្សេង]\n
* បន្ទាត់ [N+1]: [ប្អូនគួរកែអត្ថន័យបន្ត...]\n
* បន្ទាត់ [N+2]: [កំហុសនៅទីនេះគឺ...]\n
* បន្ទាត់ [N+3]: [ត្រង់ចំណុចនេះខុស...]\n

> **💡 SENIOR TIP:** [តិចនិកសម្រាប់បង]

---
Status: v16.0 | Mode: Modern Architect`;
    }
    // ... rest of the code remains the same ...
};

/**
 * @route POST /api/analyze-code
 * @desc Analyze code with KONKMENG-AI v16.0 Modern Architect Engine
 */
const analyzeCode = async (req, res) => {
    const { code, language, responseLang = 'en' } = req.body;
    const masterName = req.user?.name || "លោកម្ចាស់";
    
    if (!code) {
        return res.status(400).json({ 
            error: responseLang === 'km' ? `អត់ឃើញកូដផង ${masterName}! បញ្ជូនមកអូនឆែកឱ្យភ្លាម!` : `No code found, Master ${masterName}!`
        });
    }

    if (!GROQ_API_KEY) {
        return res.status(500).json({ 
            error: responseLang === 'km' ? 'API Key មិនត្រឹមត្រូវ' : 'API Key not configured'
        });
    }

    // Set up SSE headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    let fullResponse = '';
    let streamEnded = false;

    try {
        const response = await axios.post(GROQ_API_URL, {
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: 'system', content: getSystemPrompt(responseLang) },
                { 
                    role: 'user', 
                    content: responseLang === 'km' 
                        ? `វិភាគ ${language}:\n\n\`\`\`${language}\n${code}\n\`\`\``
                        : `Analyze ${language}:\n\n\`\`\`${language}\n${code}\n\`\`\``
                }
            ],
            stream: true,
            temperature: 0.5,
            frequency_penalty: 0,
            presence_penalty: 0,
            max_tokens: 1000
        }, {
            headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
            responseType: 'stream',
            timeout: 30000
        });

        response.data.on('data', chunk => {
            if (streamEnded) return;
            
            const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
            for (const line of lines) {
                const message = line.replace(/^data: /, '');
                if (message === '[DONE]') {
                    streamEnded = true;
                    res.write('data: [DONE]\n\n');
                    
                    // Save to history after stream completes
                    if (fullResponse && req.headers.authorization) {
                        const token = req.headers.authorization.split(' ')[1];
                        if (token) {
                            (async () => {
                                try {
                                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                                    await User.findByIdAndUpdate(decoded.id, {
                                        $push: {
                                            analysisHistory: { 
                                                code, 
                                                language, 
                                                analysis: fullResponse, 
                                                createdAt: new Date() 
                                            }
                                        }
                                    });
                                } catch (err) { 
                                    console.log('⚠️ History log failed'); 
                                }
                            })();
                        }
                    }
                    
                    return res.end();
                }
                
                try {
                    const parsed = JSON.parse(message);
                    const content = parsed.choices[0]?.delta?.content;
                    if (content) {
                        // Khmer polish: replace newlines with <br/> for better display
                        const polishedContent = responseLang === 'km' 
                            ? content.replace(/\n/g, '<br/>')
                            : content;
                        
                        fullResponse += content;
                        res.write(`data: ${JSON.stringify({ content: polishedContent })}\n\n`);
                    }
                } catch (e) { 
                    // Ignore parse errors for non-json chunks
                }
            }
        });

        response.data.on('error', (error) => {
            if (!streamEnded) {
                streamEnded = true;
                res.write(`data: ${JSON.stringify({ error: 'Stream error occurred' })}\n\n`);
                res.end();
            }
        });

        response.data.on('end', () => {
            if (!streamEnded) {
                streamEnded = true;
                res.write('data: [DONE]\n\n');
                res.end();
            }
        });

    } catch (error) {
        if (!streamEnded) {
            streamEnded = true;
            const errorMsg = responseLang === 'km' ? 'ការវិភាគបរាជ័យ' : 'Analysis failed';
            res.write(`data: ${JSON.stringify({ error: errorMsg, details: error.message })}\n\n`);
            res.end();
        }
    }
};

app.post('/api/analyze-code', analyzeCode);
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
    res.json({ 
        status: '✅ KONKMENG is running',
        message: 'Full-stack with Authentication',
        version: '3.0 (with Auth)',
        apiKey: GROQ_API_KEY ? '✅ Configured' : '❌ Missing',
        mongodb: mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected',
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

app.get('/*', spaCatchAll);

// ===== START SERVER =====
const startServer = () => {
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
};

app.listen(PORT, startServer);