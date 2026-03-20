# ⚡ QUICK REFERENCE - KONKMENG AI v5.1 | Groq Edition

## 🚀 START SERVER
```bash
npm install
npm start
```

## 🔑 REQUIRED ENV VARS
```env
GROQ_API_KEY=gsk_your_key_here
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret
```

## 🧪 TEST COMMANDS
```bash
# Health check
curl http://localhost:3000/api/health

# Analyze code (English)
curl -X POST http://localhost:3000/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{"code":"function test(){}","language":"javascript","responseLang":"en"}'

# Analyze code (Khmer)
curl -X POST http://localhost:3000/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{"code":"def test(): pass","language":"python","responseLang":"km"}'

# Check stats
curl http://localhost:3000/api/model-stats
```

## 📊 KEY CHANGES
- ✅ Groq API (llama-3.3-70b-versatile)
- ❌ Removed Gemini API
- ❌ Removed security scans
- ❌ Removed greetings
- ✅ Minimalist responses
- ✅ Redis caching (24h TTL)

## 🎯 RESPONSE FORMAT
```
🔍 Analysis
⚠️ Issues
📖 Line-by-Line
```

## 🔗 LINKS
- Get API Key: https://console.groq.com/keys
- Groq Docs: https://console.groq.com/docs
- Status: https://status.groq.com

## 💡 TIPS
- Redis is optional (graceful degradation)
- Cache saves API credits
- 30 req/min rate limit
- 100K+ daily tokens
- Both English & Khmer supported
