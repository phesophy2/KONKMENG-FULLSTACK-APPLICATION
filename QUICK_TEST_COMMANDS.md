# 🚀 Quick Test Commands - KONKMENG v5.0

## 🔧 Start Server
```bash
npm start
```

## 📊 Health Check
```bash
curl http://localhost:3000/api/health | python3 -m json.tool
```

**What to look for:**
- ✅ Redis URL: `redis://127.0.0.1:6379`
- ✅ Gemini models: 3 models listed
- ✅ Model stats: success/failed counts
- ✅ Quota handling: Enabled

## 📈 Check Model Statistics
```bash
curl http://localhost:3000/api/model-stats | python3 -m json.tool
```

**What to look for:**
- ✅ Stats for all 3 models
- ✅ Success and failed counts
- ✅ Model names: gemini-1.5-flash-latest, etc.

## 🧪 Test Code Analysis (Khmer)
```bash
curl -X POST http://localhost:3000/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const x = 1;",
    "language": "JavaScript",
    "responseLang": "km"
  }' | python3 -m json.tool
```

**What to look for in server logs:**
```
📥 ===== ANALYSIS REQUEST =====
Language: JavaScript
Response Language: km
Code length: 12
Cache Key: 9ae2ad77baf560f8...
🤖 Trying Gemini model [1/3]: gemini-1.5-flash-latest
✅ Success with model: gemini-1.5-flash-latest
📊 Model Stats: {"success":1,"failed":0}
```

## 🧪 Test Code Analysis (English)
```bash
curl -X POST http://localhost:3000/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function add(a, b) { return a + b; }",
    "language": "JavaScript",
    "responseLang": "en"
  }' | python3 -m json.tool
```

## 🔴 Test Quota Error (if quota exceeded)
```bash
curl -X POST http://localhost:3000/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const test = 123;",
    "language": "JavaScript",
    "responseLang": "km"
  }' | python3 -m json.tool
```

**Expected response when quota exceeded:**
```json
{
  "success": false,
  "error": "⚠️ ចំនួន API Credits ហួសកម្រិតហើយ!...",
  "errorCode": "QUOTA_EXCEEDED",
  "modelStats": {
    "gemini-1.5-flash-latest": { "success": 0, "failed": 1 },
    "gemini-1.5-pro-latest": { "success": 0, "failed": 1 },
    "gemini-1.5-pro-latest": { "success": 0, "failed": 1 }
  },
  "suggestion": "សូមពិនិត្យ Google AI Studio: https://aistudio.google.com/apikey"
}
```

## 🔍 Monitor Server Logs
Watch the terminal where `npm start` is running. You should see:

### On Startup:
```
🔍 ===== KONKMENG AI SYSTEM v5.0 =====
🔑 GEMINI_API_KEY exists: true
💾 REDIS_CACHE: Initializing...
🔌 Attempting Redis connection to: redis://127.0.0.1:6379

📋 GEMINI MODELS:
   • Primary: gemini-1.5-flash-latest
   • Fallback 1: gemini-1.5-pro-latest
   • Fallback 2: gemini-1.0-pro-latest
   • Quota Handling: Graceful with Khmer messages ✅
```

### On Each Request:
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

### On Model Fallback:
```
🤖 Trying Gemini model [1/3]: gemini-1.5-flash-latest
❌ Model gemini-1.5-flash-latest failed: [429 Too Many Requests]
⚠️  QUOTA EXCEEDED for model: gemini-1.5-flash-latest
⏳ Waiting 1s before trying next model...
🤖 Trying Gemini model [2/3]: gemini-1.5-pro-latest
✅ Success with model: gemini-1.5-pro-latest
📊 Model Stats: {"success":1,"failed":0}
```

## 🔧 Enable Redis (Optional)
```bash
# Install Redis (macOS)
brew install redis

# Start Redis
brew services start redis

# Verify Redis is running
redis-cli ping
# Should return: PONG

# Restart your server
npm start
```

**After Redis is running, you should see:**
```
✅ Redis connected successfully to 127.0.0.1:6379
✅ Redis ready to use
```

## 🔑 Get New API Key
1. Visit: https://aistudio.google.com/apikey
2. Delete old key (if leaked)
3. Click "Create API Key"
4. Copy the new key
5. Update `.env`:
   ```env
   GEMINI_API_KEY=YOUR_NEW_API_KEY_HERE
   ```
6. Restart server: `npm start`

## 📊 Check Quota Usage
Visit: https://aistudio.google.com/apikey
- View quota per model
- Monitor rate limits
- Check daily/monthly usage

## ✅ Success Indicators

### Server Logs Show:
- ✅ `🔌 Attempting Redis connection to: redis://127.0.0.1:6379`
- ✅ `📋 GEMINI MODELS:` with 3 models listed
- ✅ `Quota Handling: Graceful with Khmer messages ✅`
- ✅ `🤖 Trying Gemini model [1/3]: gemini-1.5-flash-latest`
- ✅ `📊 Model Stats: {"success":X,"failed":Y}`

### API Responses Include:
- ✅ `"model": "gemini-1.5-flash-latest"` (or other model)
- ✅ `"cached": true/false`
- ✅ `"modelStats"` in error responses
- ✅ Khmer error messages when `responseLang: "km"`

## 🎯 Quick Verification Checklist

- [ ] Server starts without errors
- [ ] Health endpoint shows Redis URL: `redis://127.0.0.1:6379`
- [ ] Health endpoint shows 3 Gemini models
- [ ] Model stats endpoint returns statistics
- [ ] Code analysis shows detailed logs with model name
- [ ] Quota errors show Khmer message (when `responseLang: "km"`)
- [ ] Model fallback works (tries all 3 models)
- [ ] Statistics update after each request

## 📝 Notes

- Redis is optional - server works without it (graceful degradation)
- Model fallback happens automatically when quota is exceeded
- Each model has separate quota pool
- Statistics persist during server runtime (reset on restart)
- Cache TTL is 24 hours (86400 seconds)
