const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
app.use(cors());                    
app.use(express.json());            
app.use(express.static('public'));  

console.log('\n🔍 ===== KONKMENG AI SYSTEM =====');
console.log('🔑 GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);
console.log('🔑 PORT:', PORT);
console.log('================================\n');

// ===== GROQ API CONFIGURATION =====
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Models ដែលអាចប្រើបាន 100%
const GROQ_MODELS = {
    FAST: 'llama-3.1-8b-instant',        // លឿនបំផុត
    BALANCED: 'llama-3.3-70b-versatile',  // គុណភាពល្អ
    POWERFUL: 'mixtral-8x7b-32768'        // ខ្លាំង សម្រាប់កូដស្មុគស្មាញ
};

// ===== SYSTEM PROMPTS BY LANGUAGE =====
const getSystemPrompt = (language) => {
    if (language === 'km') {
        return `You are a Khmer programming teacher. Your responses must be 100% in Khmer language only.

📋 **RESPONSE FORMAT (ធ្វើតាមទម្រង់នេះឲ្យបានត្រឹមត្រូវ)៖**

📝 **កូដដែលត្រូវជួសជុល៖**
*បន្ទាត់ទី [លេខ]: [បង្ហាញកូដដើមទាំងស្រុង]

🔧 **កំហុសដែលឃើញ៖**
- [ពន្យល់កំហុសត្រឹម ១-២ ប្រយោគប៉ុណ្ណោះ]
- [បើមានកំហុសច្រើន រាយជាចំណុចៗ]

✅ **កូដដែលបានជួសជុល៖**
\`\`\`[language]
[កូដថ្មីដែលត្រឹមត្រូវ]
\`\`\`

📖 **ការពន្យល់ម្តងមួយបន្ទាត់៖**
*បន្ទាត់ទី [លេខ]: [ពន្យល់ខ្លីៗថាបន្ទាត់នេះធ្វើអ្វី]

💡 **ឧទាហរណ៍បន្ថែម** (បើចាំបាច់)៖
\`\`\`[language]
[ឧទាហរណ៍ផ្សេងទៀត]
\`\`\`

⚠️ **សំខាន់បំផុត៖**
1. ហាមនិយាយដដែលៗដាច់ខាត
2. ហាមប្រើពាក្យអង់គ្លេសច្រើនពេក
3. ហាមពន្យល់វែងឆ្ងាយជាង ៥ ប្រយោគ
4. ត្រូវដាក់កូដក្នុង \`backticks\` ជានិច្ច
5. ត្រូវប្រើ *បន្ទាត់ទី [លេខ]៖ សម្រាប់ពន្យល់ម្តងមួយបន្ទាត់`;
    } else {
        return `You are an expert programming teacher. Your responses must be 100% in English only.

📋 **RESPONSE FORMAT (Follow this format strictly):**

📝 **Code to Fix:**
*Line [number]: [show original code]

🔧 **Errors Found:**
- [brief explanation in English, 1-2 sentences]
- [list multiple errors if needed]

✅ **Fixed Code:**
\`\`\`[language]
[corrected code]
\`\`\`

📖 **Line-by-Line Explanation:**
*Line [number]: [brief explanation of what this line does]

💡 **Additional Examples** (if needed):
\`\`\`[language]
[more examples]
\`\`\`

⚠️ **IMPORTANT:**
1. No repetition at all
2. Don't use too many technical jargon
3. Keep explanations under 5 sentences
4. Always wrap code in \`backticks\`
5. Use *Line [number]: format for line-by-line explanation`;
    }
};

// ===== API ENDPOINT សម្រាប់វិភាគកូដ =====
app.post('/api/analyze-code', async (req, res) => {
    try {
        const { code, language, responseLang = 'en' } = req.body;
        
        console.log('\n📥 ===== REQUEST RECEIVED =====');
        console.log('Programming Language:', language);
        console.log('Response Language:', responseLang);
        console.log('Code length:', code?.length || 0);

        // === VALIDATION ===
        if (!code) {
            return res.status(400).json({ 
                error: responseLang === 'km' ? 'សូមបញ្ចូលកូដ' : 'Please enter code',
                details: responseLang === 'km' ? 'អ្នកមិនទាន់បានបិទភ្ជាប់កូដទេ' : 'You have not pasted any code'
            });
        }

        if (!GROQ_API_KEY) {
            return res.status(500).json({ 
                error: responseLang === 'km' ? 'API Key មិនត្រឹមត្រូវ' : 'API Key not configured',
                details: responseLang === 'km' ? 'សូមពិនិត្យ .env របស់អ្នក' : 'Please check your .env file',
                solution: responseLang === 'km' ? 'បន្ថែម GROQ_API_KEY=gsk_xxxx ក្នុងឯកសារ .env' : 'Add GROQ_API_KEY=gsk_xxxx to your .env file'
            });
        }

        // === TRY MODELS IN ORDER ===
        const modelsToTry = [
            { name: GROQ_MODELS.FAST, type: responseLang === 'km' ? 'រហ័ស' : 'Fast' },
            { name: GROQ_MODELS.BALANCED, type: responseLang === 'km' ? 'មធ្យម' : 'Balanced' },
            { name: GROQ_MODELS.POWERFUL, type: responseLang === 'km' ? 'ខ្លាំង' : 'Powerful' }
        ];

        let lastError = null;
        let successResponse = null;

        for (const modelInfo of modelsToTry) {
            try {
                console.log(`🤔 Trying ${modelInfo.name} (${modelInfo.type})...`);

                // Create user prompt based on response language
                const userPrompt = responseLang === 'km' 
                    ? `ពន្យល់កូដ ${language} នេះឲ្យខ្លី និងច្បាស់ជាភាសាខ្មែរ៖

\`\`\`${language}
${code}
\`\`\`

សូមឆ្លើយតាមទម្រង់ដែលបានកំណត់។
សំខាន់៖ កុំនិយាយដដែលៗ កុំពន្យល់វែង ប្រើតែភាសាខ្មែរប៉ុណ្ណោះ។`
                    : `Explain this ${language} code briefly and clearly in English:

\`\`\`${language}
${code}
\`\`\`

Please follow the response format strictly.
Important: No repetition, keep explanations concise, use English only.`;

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
                    break;
                }

            } catch (error) {
                console.log(`❌ ${modelInfo.name} failed:`, error.message);
                lastError = error;
            }
        }

        // === បើមាន Response ជោគជ័យ ផ្ញើត្រឡប់ទៅ Frontend ===
        if (successResponse) {
            return res.json({
                success: true,
                analysis: successResponse,
                responseLanguage: responseLang,
                status: responseLang === 'km' ? 'វិភាគរួចរាល់' : 'Analysis complete'
            });
        }

        // === ERROR HANDLING (បើបរាជ័យទាំងអស់) ===
        throw lastError || new Error('All models failed');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        
        const responseLang = req.body?.responseLang || 'en';
        
        let errorMessage = responseLang === 'km' ? 'ការវិភាគបរាជ័យ' : 'Analysis failed';
        let errorDetails = error.message;
        let errorSolution = responseLang === 'km' ? 'សូមព្យាយាមម្តងទៀត' : 'Please try again';

        // ពិនិត្យមើលប្រភេទ Error
        if (error.response) {
            const status = error.response.status;
            
            if (status === 401 || status === 403) {
                errorMessage = responseLang === 'km' ? 'បញ្ហា API Key' : 'API Key issue';
                errorDetails = responseLang === 'km' ? 'API Key របស់អ្នកមិនត្រឹមត្រូវ' : 'Your API Key is incorrect';
                errorSolution = responseLang === 'km' ? 'សូមពិនិត្យ GROQ_API_KEY ក្នុងឯកសារ .env' : 'Please check GROQ_API_KEY in your .env file';
            }
            else if (status === 429) {
                errorMessage = responseLang === 'km' ? 'ហួសកំណត់ប្រើប្រាស់' : 'Rate limit exceeded';
                errorDetails = responseLang === 'km' ? 'អ្នកបានប្រើ API ច្រើនពេកក្នុងពេលខ្លី' : 'You have exceeded API rate limits';
                errorSolution = responseLang === 'km' ? 'រង់ចាំ ១ នាទី រួចព្យាយាមម្តងទៀត' : 'Wait 1 minute and try again';
            }
            else if (status === 400) {
                errorMessage = responseLang === 'km' ? 'សំណើមិនត្រឹមត្រូវ' : 'Invalid request';
                errorDetails = error.response.data?.error?.message || 'Bad request';
                errorSolution = responseLang === 'km' ? 'សូមពិនិត្យកូដដែលបានបញ្ចូល' : 'Please check your code input';
            }
        }

        res.status(500).json({
            error: errorMessage,
            details: errorDetails,
            solution: errorSolution
        });
    }
});

// ===== API ENDPOINT សម្រាប់ពិនិត្យស្ថានភាព =====
app.get('/api/health', (req, res) => {
    res.json({ 
        status: '✅ KONKMENG is running',
        message: 'Bilingual Code Analysis System (Khmer/English)',
        version: '2.0 (Bilingual)',
        apiKey: GROQ_API_KEY ? '✅ Configured' : '❌ Missing',
        models: GROQ_MODELS,
        languages: ['Khmer', 'English'],
        timestamp: new Date().toISOString()
    });
});

// ===== START SERVER =====
app.listen(PORT, () => {
    console.log('\n🚀 ============================================');
    console.log(`🚀 KONKMENG Server running on http://localhost:${PORT}`);
    console.log('🚀 ============================================\n');
    console.log('📋 BILINGUAL FEATURE:');
    console.log('   • Khmer responses (ភាសាខ្មែរ)');
    console.log('   • English responses');
    console.log('   • Select from dropdown in UI\n');
    console.log('📋 Health check: http://localhost:' + PORT + '/api/health');
    console.log('📋 Analyze: POST http://localhost:' + PORT + '/api/analyze-code');
    console.log('\n✅ Ready! Server is waiting for requests...\n');
});