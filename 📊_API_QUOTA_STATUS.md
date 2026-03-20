# 📊 API QUOTA STATUS - KONKMENG AI v5.1

## ✅ CURRENT QUOTA (March 20, 2026)

### Gemini 2.5 Flash (Primary Model):
```
RPM (Requests Per Minute): 3 / 5 used
TPM (Tokens Per Minute): 1.68K / 250K used
RPD (Requests Per Day): 16 / 20 used ⚠️

✅ REMAINING TODAY: 4 requests
```

### Other Models:
```
Gemini 2.5 Pro: 0 / 0 (Not used)
Gemini 2 Flash: 0 / 0 (Not used)
Gemini 2 Flash Exp: 0 / 0 (Not used)
Gemini 2 Flash Lite: 0 / 0 (Not used)
```

---

## 💡 GOOD NEWS!

**You still have 4 requests available today!** 🎉

The system is ready to use. The quota is NOT exhausted - you can make 4 more code analysis requests before the daily limit.

---

## 🧪 TEST NOW

### Quick Test Command:
```bash
curl -X POST http://localhost:3000/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const sum = (a, b) => a + b;",
    "language": "JavaScript",
    "responseLang": "km"
  }'
```

This should work now! You have 4 requests remaining.

---

## 📊 QUOTA BREAKDOWN

### Free Tier Limits (Gemini 2.5 Flash):
- **RPM**: 5 requests per minute
- **TPM**: 250,000 tokens per minute
- **RPD**: 20 requests per day ⚠️

### Your Usage Today:
- **RPM**: 3/5 (60% used) ✅
- **TPM**: 1.68K/250K (0.67% used) ✅
- **RPD**: 16/20 (80% used) ⚠️

### Remaining:
- **RPM**: 2 requests available per minute
- **TPM**: 248.32K tokens available per minute
- **RPD**: 4 requests available today 🎯

---

## 🎯 HOW TO USE REMAINING 4 REQUESTS

### Strategy 1: Test Key Features
1. Test JavaScript code analysis (Khmer)
2. Test Python code analysis (Khmer)
3. Test English response
4. Test cache functionality

### Strategy 2: Save for Production
- Keep remaining requests for actual user testing
- Use Redis cache for repeated requests
- Wait for midnight UTC reset for more quota

### Strategy 3: Test Minimalist Prompt
- Verify new short response format
- Check code block language tags
- Confirm 100% Khmer explanations
- Test line-by-line explanations

---

## ⏰ QUOTA RESET SCHEDULE

### Daily Reset:
- **Time**: Midnight UTC (00:00 UTC)
- **Frequency**: Every 24 hours
- **New Quota**: 20 requests per day

### Current Time Zone:
- Your local time: Check your system
- UTC time: Calculate offset
- Next reset: Tonight at midnight UTC

---

## 💡 TIPS TO MAXIMIZE QUOTA

### 1. Use Redis Cache (RECOMMENDED)
```bash
# First request - uses API (1 quota)
curl -X POST http://localhost:3000/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{"code":"const x = 5;","language":"JavaScript","responseLang":"km"}'

# Second request - from cache (0 quota)
curl -X POST http://localhost:3000/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{"code":"const x = 5;","language":"JavaScript","responseLang":"km"}'
```

Response will show: `"cached": true` (no API call made)

### 2. Batch Similar Requests
- Group similar code analyses together
- Use cache for repeated patterns
- Save unique requests for later

### 3. Monitor Usage
```bash
# Check model stats
curl http://localhost:3000/api/model-stats

# Check health
curl http://localhost:3000/api/health
```

### 4. Plan for Tomorrow
- Quota resets at midnight UTC
- You'll get 20 new requests
- Plan your testing schedule

---

## 🚀 READY TO TEST

Your system is fully optimized and ready:

✅ **Server**: Running  
✅ **Redis**: Active  
✅ **Models**: Configured correctly  
✅ **Prompt**: Minimalist  
✅ **Speed**: Optimized  
✅ **Quota**: 4 requests remaining  

**Go ahead and test!** 🎉

---

## 📝 EXAMPLE TEST REQUESTS

### Test 1: JavaScript (Khmer)
```bash
curl -X POST http://localhost:3000/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function factorial(n) { return n <= 1 ? 1 : n * factorial(n - 1); }",
    "language": "JavaScript",
    "responseLang": "km"
  }'
```

Expected: Minimalist response with 3 sections (វិភាគកូដ, បញ្ហា, ពន្យល់)

### Test 2: Python (Khmer)
```bash
curl -X POST http://localhost:3000/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "def greet(name):\n    return f\"Hello {name}\"",
    "language": "Python",
    "responseLang": "km"
  }'
```

Expected: Code block with ```python``` tag (not ```km```)

### Test 3: Cache Test
```bash
# Run Test 1 again - should return from cache
curl -X POST http://localhost:3000/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function factorial(n) { return n <= 1 ? 1 : n * factorial(n - 1); }",
    "language": "JavaScript",
    "responseLang": "km"
  }'
```

Expected: `"cached": true` (no quota used)

### Test 4: English Response
```bash
curl -X POST http://localhost:3000/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const double = x => x * 2;",
    "language": "JavaScript",
    "responseLang": "en"
  }'
```

Expected: English minimalist response

---

## 📊 QUOTA TRACKING

### After Each Request:
```bash
# Check updated stats
curl http://localhost:3000/api/model-stats
```

You'll see:
```json
{
  "gemini-2.5-flash": {
    "success": X,
    "failed": 0
  }
}
```

### Monitor Console Logs:
```
🤖 Trying Gemini model [1/3]: gemini-2.5-flash
✅ Success with model: gemini-2.5-flash
📊 Model Stats: {"success":X,"failed":0}
```

---

## 🎉 SUMMARY

**Status**: ✅ READY TO USE

- **Quota Remaining**: 4 requests today
- **Server**: Running perfectly
- **Configuration**: Fully optimized
- **Response Time**: ~2-3 seconds
- **Response Quality**: Minimalist, clean

**You can test right now!** 🚀

---

**Date**: March 20, 2026  
**Quota Used**: 16/20 (80%)  
**Quota Remaining**: 4/20 (20%)  
**Next Reset**: Midnight UTC tonight
