# 🎯 GROQ DEPLOYMENT GUIDE

## ✅ MIGRATION STATUS: COMPLETE

KONKMENG AI v5.1 has been successfully migrated from Gemini API to Groq API.

---

## 🚀 QUICK START (3 STEPS)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Groq API Key
Get your API key from: **https://console.groq.com/keys**

Update `.env` file:
```env
GROQ_API_KEY=gsk_your_actual_groq_api_key_here
```

### Step 3: Start Server
```bash
npm start
```

Server will run on: **http://localhost:3000**

---

## 🧪 TESTING

### Option 1: Use Test Script
```bash
chmod +x test-groq-api.sh
./test-groq-api.sh
```

### Option 2: Manual cURL Tests

**Health Check:**
```bash
curl http://localhost:3000/api/health
```

**Code Analysis (English):**
```bash
curl -X POST http://localhost:3000/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function hello() { console.log(\"Hello\"); }",
    "language": "javascript",
    "responseLang": "en"
  }'
```

**Code Analysis (Khmer):**
```bash
curl -X POST http://localhost:3000/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "def greet():\n    print(\"Hello\")",
    "language": "python",
    "responseLang": "km"
  }'
```

**Check Groq Stats:**
```bash
curl http://localhost:3000/api/model-stats
```

---

## 📊 WHAT CHANGED

### ✅ ADDED
- Groq SDK integration (`groq-sdk`)
- Single model: `llama-3.3-70b-versatile`
- Groq usage statistics tracking
- Minimalist system prompt (no security scans, no greetings)
- Khmer error message: "មានបញ្ហាបច្ចេកទេសជាមួយ Groq API សូមព្យាយាមម្តងទៀត"

### ❌ REMOVED
- Gemini API (`@google/generative-ai`)
- 3-tier model fallback system
- `performSecurityScan()` function
- Security audit context
- Quota exceeded handling (Groq has much higher limits)
- Conversational greetings and fillers

### 🔄 KEPT
- Redis caching (24-hour TTL)
- MongoDB user authentication
- JWT token system
- Rate limiting (50 req/15min)
- Khmer language support
- Code block formatting

---

## 🔑 ENVIRONMENT VARIABLES

Required in `.env`:
```env
# Groq API (REQUIRED)
GROQ_API_KEY=gsk_your_key_here

# MongoDB (REQUIRED)
MONGODB_URI=mongodb+srv://...

# JWT (REQUIRED)
JWT_SECRET=your_secret_key

# Redis (OPTIONAL - graceful degradation)
REDIS_URL=redis://127.0.0.1:6379

# App Config
NODE_ENV=production
PORT=3000
APP_URL=https://konkmeng.onrender.com
```

---

## 🤖 GROQ MODEL INFO

**Model:** `llama-3.3-70b-versatile`

**Specifications:**
- Context: 128K tokens
- Speed: Ultra-fast (optimized inference)
- Languages: English + Khmer
- Rate Limits: 100K+ daily tokens
- Cost: More affordable than Gemini

**Why Groq?**
1. Faster inference than Gemini
2. Higher rate limits (no 20 RPD restriction)
3. Better cost-effectiveness
4. Excellent Khmer language support
5. Simpler integration (no model rotation needed)

---

## 📝 API ENDPOINTS

### 1. Health Check
```
GET /api/health
```
Returns server status, Groq model info, Redis status, MongoDB status.

### 2. Code Analysis
```
POST /api/analyze-code
Content-Type: application/json

{
  "code": "your code here",
  "language": "javascript",
  "responseLang": "en" or "km"
}
```

### 3. Model Statistics
```
GET /api/model-stats
```
Returns Groq usage stats (success, failed, totalTokens, lastUsed).

### 4. User Authentication
```
POST /api/auth/signup
POST /api/auth/login
GET /api/auth/profile (requires JWT token)
```

---

## 🎨 RESPONSE FORMAT

### English Response Structure:
```
🔍 Analysis
[Brief overview of the code]

⚠️ Issues Found
[List of issues, if any]

📖 Line-by-Line Explanation
[Detailed explanation]
```

### Khmer Response Structure:
```
🔍 វិភាគកូដ
[ការពិពណ៌នាសង្ខេប]

⚠️ បញ្ហាដែលរកឃើញ
[បញ្ហាដែលរកឃើញ]

📖 ពន្យល់បន្ទាត់ម្តងមួយៗ
[ការពន្យល់លម្អិត]
```

---

## 🚨 TROUBLESHOOTING

### Issue: "API Key not configured"
**Solution:** Add `GROQ_API_KEY` to `.env` file

### Issue: "MongoDB connection error"
**Solution:** Check `MONGODB_URI` in `.env` file

### Issue: Redis warnings
**Solution:** Redis is optional. Server works without it (no caching).

### Issue: "Groq API failed"
**Solution:** 
1. Check API key is valid
2. Check internet connection
3. Verify Groq service status: https://status.groq.com

### Issue: Empty or incorrect responses
**Solution:**
1. Check `responseLang` is "en" or "km"
2. Verify code is properly escaped in JSON
3. Check server logs for errors

---

## 📦 DEPLOYMENT CHECKLIST

- [ ] Run `npm install` to update dependencies
- [ ] Add `GROQ_API_KEY` to `.env`
- [ ] Verify MongoDB connection
- [ ] Test locally: `npm start`
- [ ] Run test script: `./test-groq-api.sh`
- [ ] Check health endpoint works
- [ ] Test English analysis
- [ ] Test Khmer analysis
- [ ] Verify Redis caching (optional)
- [ ] Deploy to production (Render, Heroku, etc.)
- [ ] Update production environment variables

---

## 🎉 SUCCESS INDICATORS

✅ Server starts without errors  
✅ Health check returns Groq Edition info  
✅ Code analysis works in English  
✅ Code analysis works in Khmer  
✅ Redis caching saves API credits  
✅ Groq stats show success count  
✅ Response format is minimalist (no security scans)  
✅ Code blocks use proper language tags (not `km`)  

---

## 📞 SUPPORT

**Groq Console:** https://console.groq.com  
**Groq Docs:** https://console.groq.com/docs  
**Groq Status:** https://status.groq.com  

---

**Migration Date:** March 20, 2026  
**Version:** KONKMENG AI v5.1 | Groq Edition  
**Status:** ✅ READY FOR DEPLOYMENT
