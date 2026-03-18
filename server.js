const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
app.use(cors());                    
app.use(express.json());            
app.use(express.static('public'));  

console.log('\n🔍 ===== KONKMENG AI SYSTEM =====');
console.log('🔑 GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);
console.log('🔑 MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('🔑 JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('🔑 PORT:', PORT);
console.log('================================\n');

// ===== DATABASE CONNECTION =====
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/konkmen')
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
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
        required: [true, 'Password is required'],
        minlength: 8,
        select: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date
    },
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
userSchema.pre('save', async function(next) {
    try {
        console.log('🔐 Hashing password for user:', this.email);
        
        if (!this.isModified('password')) {
            return next();
        }
        
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        console.log('✅ Password hashed successfully');
        next();
    } catch (error) {
        console.error('❌ Error hashing password:', error);
        next(error);
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

// ===== CODE ANALYSIS ROUTE =====

// GROQ API CONFIGURATION
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const GROQ_MODELS = {
    FAST: 'llama-3.1-8b-instant',
    BALANCED: 'llama-3.3-70b-versatile',
    POWERFUL: 'mixtral-8x7b-32768'
};

// System prompts
const getSystemPrompt = (language) => {
    if (language === 'km') {
        return `You are a Khmer programming teacher. Your responses must be 100% in Khmer language only.

📋 **RESPONSE FORMAT:**

📝 **កូដដែលត្រូវជួសជុល៖**
*បន្ទាត់ទី [លេខ]: [បង្ហាញកូដដើម]

🔧 **កំហុសដែលឃើញ៖**
- [ពន្យល់កំហុស]

✅ **កូដដែលបានជួសជុល៖**
\`\`\`[language]
[កូដថ្មី]
\`\`\`

📖 **ការពន្យល់ម្តងមួយបន្ទាត់៖**
*បន្ទាត់ទី [លេខ]: [ពន្យល់]`;
    } else {
        return `You are an expert programming teacher. Your responses must be 100% in English only.

📋 **RESPONSE FORMAT:**

📝 **Code to Fix:**
*Line [number]: [show original code]

🔧 **Errors Found:**
- [brief explanation]

✅ **Fixed Code:**
\`\`\`[language]
[corrected code]
\`\`\`

📖 **Line-by-Line Explanation:**
*Line [number]: [brief explanation]`;
    }
};

/**
 * @route POST /api/analyze-code
 * @desc Analyze code with Groq AI
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

        if (!GROQ_API_KEY) {
            return res.status(500).json({ 
                error: responseLang === 'km' ? 'API Key មិនត្រឹមត្រូវ' : 'API Key not configured'
            });
        }

        // Try models in order
        const modelsToTry = [
            { name: GROQ_MODELS.FAST, type: 'Fast' },
            { name: GROQ_MODELS.BALANCED, type: 'Balanced' },
            { name: GROQ_MODELS.POWERFUL, type: 'Powerful' }
        ];

        let lastError = null;
        let successResponse = null;

        for (const modelInfo of modelsToTry) {
            try {
                console.log(`🤔 Trying ${modelInfo.name}...`);

                const userPrompt = responseLang === 'km' 
                    ? `ពន្យល់កូដ ${language} នេះជាភាសាខ្មែរ៖

\`\`\`${language}
${code}
\`\`\`

សូមឆ្លើយតាមទម្រង់ដែលបានកំណត់។`
                    : `Explain this ${language} code in English:

\`\`\`${language}
${code}
\`\`\`

Please follow the response format.`;

                const response = await axios.post(GROQ_API_URL, {
                    model: modelInfo.name,
                    messages: [
                        {
                            role: 'system',
                            content: getSystemPrompt(responseLang)
                        },
                        {
                            role: 'user',
                            content: userPrompt
                        }
                    ],
                    temperature: 0.2,
                    max_tokens: 1500,
                    top_p: 0.85,
                    frequency_penalty: 0.7,
                    presence_penalty: 0.6
                }, {
                    headers: {
                        'Authorization': `Bearer ${GROQ_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                });

                if (response.data?.choices?.[0]) {
                    console.log(`✅ Success with ${modelInfo.name}`);
                    successResponse = response.data.choices[0].message.content;
                    
                    // បើមាន Token (អ្នកប្រើបាន Login) រក្សាទុកក្នុង History
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
            return res.json({
                success: true,
                analysis: successResponse,
                responseLanguage: responseLang,
                status: responseLang === 'km' ? 'វិភាគរួចរាល់' : 'Analysis complete'
            });
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

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
    res.json({ 
        status: '✅ KONKMENG is running',
        message: 'Full-stack with Authentication',
        version: '3.0 (with Auth)',
        apiKey: GROQ_API_KEY ? '✅ Configured' : '❌ Missing',
        mongodb: mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected',
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