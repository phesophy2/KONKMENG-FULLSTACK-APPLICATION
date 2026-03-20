# 🔧 KONKMENG v5.0 - Quota Handling & Monitoring Guide

## ✅ Improvements Implemented

### 1. Enhanced Redis Configuration
- ✅ Explicitly configured to use `127.0.0.1:6379`
- ✅ Clear logging shows Redis connection URL on startup
- ✅ Graceful degradation message when Redis is unavailable

### 2. Improved Model Fallback Strategy
- ✅ Updated to use correct Gemini model names:
  - Primary: `gemini-1.5-flash-latest`
  - Fallback 1: `gemini-1.5-pro-latest`
  - Fallback 2: `gemini-1.0-pro-latest`
- ✅ 1-second delay between model attempts (rate limiting)
- ✅ Progress indicator: [1/3], [2/3], [3/3]

### 3. Advanced Logging
Every API request now shows:
```
📥 ===== ANALYSIS REQUEST =====
Language: JavaScript
Response Language: km
Code length: 127
Cache Key: 9ae2ad77baf560f8...
⚠️  Redis not connected - Skipping cache check
🤖 Trying Gemini model [1/3]: gemini-1.5-flash-latest
✅ Success with model: gemini-1.5-flash-latest
📊 Model Stats: {"success":1,"failed":0}
✅ Analysis completed successfully
```

### 4. Graceful Quota Error Handling

#### Khmer Error Message:
```
⚠️ ចំនួន API Credits ហួសកម្រិតហើយ!

សូមរង់ចាំ ៥-១០ នាទី ឬប្រើ API Key ថ្មី។
ប្រព័ន្ធនឹងព្យាយាមប្រើ Model ផ្សេងទៀតដោយស្វ័យប្រវត្តិ។

💡 ដំបូន្មាន: ប្រើ Redis Cache ដើម្បីសន្សំ API Credits។
```

#### English Error Message:
```
⚠️ API Quota Exceeded!

Please wait 5-10 minutes or use a new API key.
The system will automatically try different models.

💡 Tip: Use Redis Cache to save API credits.
```

### 5. Model Usage Statistics

#### New Endpoint: `/api/model-stats`
```bash
curl http://localhost:3000/api/model-stats
```

Response:
```json
{
  "success": true,
  "stats": {
    "gemini-1.5-flash-latest": {
      "success": 15,
      "failed": 2
    },
    "gemini-1.5-pro-latest": {
      "success": 2,
      "failed": 0
    },
    "gemini-1.0-pro-latest": {
      "success": 0,
      "failed": 0
    }
  },
  "models": [
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro-latest",
    "gemini-1.0-pro-latest"
  ],
  "message": "Model usage statistics"
}
```

### 6. Enhanced Health Endpoint

Now includes detailed Redis and model information:
```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "✅ KONKMENG is running",
  "version": "5.0",
  "engine": "Google Gemini (Multi-Model Fallback)",
  "redis": {
    "status": "✅ Connected",
    "url": "redis://127.0.0.1:6379",
    "caching": "Active (24h TTL)"
  },
  "geminiModels": {
    "available": [
      "gemini-1.5-flash-latest",
      "gemini-1.5-pro-latest",
      "gemini-1.0-pro-latest"
    ],
    "stats": {
      "gemini-1.5-flash-latest": { "success": 15, "failed": 2 },
      "gemini-1.5-pro-latest": { "success": 2, "failed": 0 },
      "gemini-1.0-pro-latest": { "success": 0, "failed": 0 }
    }
  },
  "features": {
    "modelFallback": "✅ 3-tier rotation",
    "quotaHandling": "✅ Graceful with Khmer messages"
  }
}
```

## 🚨 Current API Key Issue

Your current API key has been reported as leaked:
```
Error: Your API key was reported as leaked. Please use another API key.
```

### Solution:
1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Delete the leaked key: `AIzaSyBCmnf3Oq0mHzul4B7qutBLNd9GuhhCt3U`
3. Create a new API key
4. Update `.env` file:
   ```env
   GEMINI_API_KEY=YOUR_NEW_API_KEY_HERE
   ```
5. Restart the server

## 📊 Monitoring Quota Usage

### Method 1: Check Server Logs
Every request shows which model was used:
```
🤖 Trying Gemini model [1/3]: gemini-1.5-flash-latest
✅ Success with model: gemini-1.5-flash-latest
📊 Model Stats: {"success":1,"failed":0}
```

### Method 2: Check Model Stats Endpoint
```bash
curl http://localhost:3000/api/model-stats | python3 -m json.tool
```

### Method 3: Check Health Endpoint
```bash
curl http://localhost:3000/api/health | python3 -m json.tool
```

### Method 4: Google AI Studio Dashboard
Visit: https://aistudio.google.com/apikey
- View quota usage per model
- Monitor rate limits
- Check daily/monthly limits

## 🎯 How Model Fallback Works

1. **First Attempt**: `gemini-1.5-flash-latest`
   - Fastest and most cost-effective
   - Best for simple code analysis
   
2. **Second Attempt**: `gemini-1.5-pro-latest` (if first fails)
   - More powerful for complex code
   - Higher quota limits
   
3. **Third Attempt**: `gemini-1.0-pro-latest` (if both fail)
   - Fallback for when newer models are unavailable
   - Separate quota pool

4. **All Failed**: Return graceful error with Khmer message

## 💾 Redis Cache Benefits

When Redis is connected:
- ✅ Same code analysis is cached for 24 hours
- ✅ Saves API credits (no duplicate API calls)
- ✅ Faster response time (instant from cache)
- ✅ Cache key based on: `code + language + responseLang`

### To Enable Redis:
```bash
# macOS (using Homebrew)
brew install redis
brew services start redis

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

## 🔄 Error Response Format

### Quota Exceeded (429):
```json
{
  "success": false,
  "error": "⚠️ ចំនួន API Credits ហួសកម្រិតហើយ!...",
  "errorCode": "QUOTA_EXCEEDED",
  "modelStats": {
    "gemini-1.5-flash-latest": { "success": 10, "failed": 5 },
    "gemini-1.5-pro-latest": { "success": 2, "failed": 3 },
    "gemini-1.0-pro-latest": { "success": 0, "failed": 2 }
  },
  "suggestion": "សូមពិនិត្យ Google AI Studio: https://aistudio.google.com/apikey"
}
```

### All Models Failed (500):
```json
{
  "success": false,
  "error": "ការវិភាគបរាជ័យ សូមព្យាយាមម្តងទៀត",
  "details": "ALL_MODELS_FAILED",
  "modelStats": {
    "gemini-1.5-flash-latest": { "success": 0, "failed": 1 },
    "gemini-1.5-pro-latest": { "success": 0, "failed": 1 },
    "gemini-1.0-pro-latest": { "success": 0, "failed": 1 }
  }
}
```

## 📝 Testing the Improvements

### Test 1: Check Health
```bash
curl http://localhost:3000/api/health | python3 -m json.tool
```

### Test 2: Check Model Stats
```bash
curl http://localhost:3000/api/model-stats | python3 -m json.tool
```

### Test 3: Analyze Code (Khmer)
```bash
curl -X POST http://localhost:3000/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const x = 1;",
    "language": "JavaScript",
    "responseLang": "km"
  }' | python3 -m json.tool
```

### Test 4: Analyze Code (English)
```bash
curl -X POST http://localhost:3000/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function add(a, b) { return a + b; }",
    "language": "JavaScript",
    "responseLang": "en"
  }' | python3 -m json.tool
```

## 🎉 Summary

All requested improvements have been implemented:
- ✅ Redis explicitly configured to `127.0.0.1:6379`
- ✅ Graceful quota error handling with Khmer messages
- ✅ 3-tier model fallback with correct model names
- ✅ Detailed logging showing which model is used
- ✅ Model usage statistics tracking
- ✅ New `/api/model-stats` endpoint
- ✅ Enhanced health endpoint with Redis and model info
- ✅ 1-second retry delay between models
- ✅ Progress indicators [1/3], [2/3], [3/3]

**Next Step**: Get a new API key from Google AI Studio to replace the leaked one.
