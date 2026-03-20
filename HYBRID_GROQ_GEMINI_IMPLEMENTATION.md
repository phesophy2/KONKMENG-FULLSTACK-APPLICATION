# 🔄 HYBRID GROQ + GEMINI IMPLEMENTATION GUIDE

## 📋 OVERVIEW

This guide explains how to implement a hybrid system that uses:
- **Groq API** (Llama-3.1-70b-versatile) for English responses
- **Gemini API** (gemini-2.5-flash) for Khmer responses

## 🔑 STEP 1: Get Groq API Key

1. Go to https://console.groq.com/
2. Sign up / Log in
3. Navigate to API Keys
4. Create new API key
5. Copy the key

## 📝 STEP 2: Update .env File

Add your Groq API key to `.env`:

```bash
GROQ_API_KEY=gsk_your_actual_groq_api_key_here
```

Current `.env` structure:
```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=konkmen2026superSecretKeyPheSophyMaster
GEMINI_API_KEY=AIzaSyBSpaJTfUi5K4yaRiwNFulndBM_iMqhHcM
GROQ_API_KEY=YOUR_GROQ_API_KEY_HERE  # ← Add this
APP_URL=https://konkmeng.onrender.com
...
```

## 📦 STEP 3: Install Dependencies (if needed)

Groq uses standard HTTP requests, so no new package needed. We'll use `axios` which is already installed.

## 🔧 STEP 4: Implementation Code

### Add Groq Configuration (after Gemini config in server.js):

```javascript
// ===== GROQ API CONFIGURATION =====
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-70b-versatile';

/**
 * Call Groq API for English responses
 */
async function callGroqAPI(systemPrompt, userPrompt) {
    if (!GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY not configured');
    }

    const response = await axios.post(
        GROQ_API_URL,
        {
            model: GROQ_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 2048
        },
        {
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 second timeout
        }
    );

    return response.data.choices[0].message.content;
}
```

### Update analyzeCode Function:

Replace the Gemini API call section with hybrid logic:

```javascript
// HYBRID LOGIC: Use Groq for English, Gemini for Khmer
let analysis = null;
let usedModel = null;

if (responseLang === 'en' && GROQ_API_KEY) {
    // Use Groq for English
    try {
        console.log('🤖 Using Groq API (Llama-3.1-70b) for English response');
        
        const prompt = `Analyze this ${language} code:${securityContext}\n\n\`\`\`${language}\n${code}\n\`\`\``;
        
        analysis = await Promise.race([
            callGroqAPI(getSystemPrompt(responseLang), prompt),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Groq API timeout after 30s')), 30000)
            )
        ]);
        
        usedModel = GROQ_MODEL;
        console.log('✅ Success with Groq API');
        
    } catch (groqError) {
        console.log('❌ Groq API failed:', groqError.message);
        console.log('⚠️  Falling back to Gemini...');
        // Fall through to Gemini
    }
}

// Use Gemini for Khmer OR if Groq failed
if (!analysis) {
    let quotaExceeded = false;
    
    for (let i = 0; i < GEMINI_MODELS.length; i++) {
        const modelName = GEMINI_MODELS[i];
        
        try {
            console.log(`🤖 Trying Gemini model [${i + 1}/${GEMINI_MODELS.length}]: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            
            const prompt = responseLang === 'km' 
                ? `វិភាគកូដ ${language} នេះ:${securityContext}\n\n\`\`\`${language}\n${code}\n\`\`\``
                : `Analyze this ${language} code:${securityContext}\n\n\`\`\`${language}\n${code}\n\`\`\``;

            const result = await Promise.race([
                model.generateContent([
                    { text: getSystemPrompt(responseLang) },
                    { text: prompt }
                ]),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Gemini API timeout after 30s')), 30000)
                )
            ]);

            const response = await result.response;
            analysis = response.text();
            usedModel = modelName;
            
            modelUsageStats[modelName].success++;
            console.log(`✅ Success with model: ${modelName}`);
            break;
            
        } catch (modelError) {
            if (modelUsageStats[modelName]) {
                modelUsageStats[modelName].failed++;
            }
            
            console.log(`❌ Model ${modelName} failed:`, modelError.message);
            
            if (modelError.message && modelError.message.includes('429')) {
                quotaExceeded = true;
            }
            
            if (i === GEMINI_MODELS.length - 1) {
                throw new Error(quotaExceeded ? 'QUOTA_EXCEEDED' : 'ALL_MODELS_FAILED');
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}
```

## 🧪 TESTING

### Test English (Groq):
```bash
curl -X POST http://localhost:3000/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const sum = (a, b) => a + b;",
    "language": "JavaScript",
    "responseLang": "en"
  }'
```

Expected: Uses Groq API (Llama-3.1-70b)

### Test Khmer (Gemini):
```bash
curl -X POST http://localhost:3000/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const sum = (a, b) => a + b;",
    "language": "JavaScript",
    "responseLang": "km"
  }'
```

Expected: Uses Gemini API (gemini-2.5-flash)

## 📊 BENEFITS

### Groq API (English):
- ✅ **Faster**: ~500ms response time
- ✅ **Free Tier**: 30 requests/minute, 14,400/day
- ✅ **No Quota Issues**: Much higher limits
- ✅ **Cost Effective**: Free for development

### Gemini API (Khmer):
- ✅ **Better Khmer**: Native Khmer support
- ✅ **Accurate**: Better for Khmer explanations
- ✅ **Proven**: Already working well

## 🎯 QUOTA COMPARISON

| API | RPM | RPD | Best For |
|-----|-----|-----|----------|
| **Groq** | 30 | 14,400 | English responses |
| **Gemini 2.5 Flash** | 5 | 20 | Khmer responses |

## 💡 ADVANTAGES

1. **Save Gemini Quota**: Use only for Khmer
2. **Faster English**: Groq is very fast
3. **Higher Limits**: 14,400 vs 20 requests/day
4. **Fallback**: If Groq fails, use Gemini
5. **Best of Both**: Groq speed + Gemini Khmer quality

## 🚀 NEXT STEPS

1. Get Groq API key from https://console.groq.com/
2. Add to `.env` file
3. Restart server: `npm start`
4. Test both English and Khmer
5. Monitor console logs to see which API is used

## 📝 CONSOLE OUTPUT

### English Request (Groq):
```
📥 ===== ANALYSIS REQUEST =====
Language: JavaScript
Response Language: en
🤖 Using Groq API (Llama-3.1-70b) for English response
✅ Success with Groq API
✅ Analysis completed successfully
```

### Khmer Request (Gemini):
```
📥 ===== ANALYSIS REQUEST =====
Language: JavaScript
Response Language: km
🤖 Trying Gemini model [1/3]: gemini-2.5-flash
✅ Success with model: gemini-2.5-flash
✅ Analysis completed successfully
```

## ⚠️ IMPORTANT NOTES

1. **Get Groq API Key**: You MUST get a real Groq API key
2. **Replace Placeholder**: Change `YOUR_GROQ_API_KEY_HERE` in `.env`
3. **Restart Server**: After adding key, restart with `npm start`
4. **Test Both**: Test English and Khmer separately
5. **Monitor Logs**: Check console to see which API is used

---

**Status**: Ready to implement  
**Complexity**: Medium  
**Time**: ~10 minutes  
**Benefit**: Save Gemini quota, faster English responses
