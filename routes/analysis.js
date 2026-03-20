const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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
router.post('/analyze-code', async (req, res) => {
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
                    
                    // Save to history if user is authenticated
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

module.exports = router;
