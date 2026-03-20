// ===== PASTE THIS CODE INTO server.js =====

// 1. ADD THIS AFTER THE IMPORTS (around line 70):

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

// 2. UPDATE THE CONSOLE.LOG SECTION (around line 65):
console.log('\n🔍 ===== KONKMENG AI SYSTEM =====');
console.log('🔑 GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('🔑 MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('🔑 JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('📧 EMAIL_SERVICE: Ethereal Email (Test/Development)');
console.log('💾 REDIS_CACHE: Initializing...');
console.log('🔑 PORT:', PORT);
console.log('================================\n');

// 3. REPLACE THE ENTIRE /api/analyze-code ENDPOINT WITH THIS:

/**
 * @route POST /api/analyze-code
 * @desc Analyze code with Google Gemini AI (with Redis caching & security audit)
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

        // Try Gemini models in order
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
