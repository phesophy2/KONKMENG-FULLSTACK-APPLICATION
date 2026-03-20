# 🚀 Production Test Suite

## 📍 Production URL
**URL:** https://konkmeng.onrender.com

---

## 🧪 Test Suite

### Test 1: Health Check ✅
**Purpose:** Verify server is running and check Redis status

```bash
curl https://konkmeng.onrender.com/api/health
```

**Expected Response:**
```json
{
  "status": "✅ KONKMENG is running",
  "message": "Full-stack with Authentication",
  "version": "5.0 (with Gemini AI + Redis Cache + Security Audit)",
  "apiKey": "✅ Configured",
  "mongodb": "✅ Connected" or "❌ Disconnected",
  "redis": "✅ Connected" or "❌ Disconnected",
  "timestamp": "2026-03-20T..."
}
```

---

### Test 2: Security Audit - Hardcoded Secret (Khmer) 🔒
**Purpose:** Test security audit with hardcoded API key in Khmer

```bash
curl -X POST https://konkmeng.onrender.com/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const apiKey = \"sk-1234567890abcdef\";",
    "language": "JavaScript",
    "responseLang": "km"
  }'
```

**Expected:** Security audit in 100% natural Khmer detecting hardcoded secret

**Look for:**
- `🔒 **ការត្រួតពិនិត្យសុវត្ថិភាព:**`
- Detection of hardcoded API key
- Security score (should be low, like 2-3/10)

---

### Test 3: Security Audit - SQL Injection (English) 🔒
**Purpose:** Test SQL injection detection in English

```bash
curl -X POST https://konkmeng.onrender.com/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const query = \"SELECT * FROM users WHERE id = \" + userId;",
    "language": "JavaScript",
    "responseLang": "en"
  }'
```

**Expected:** Security audit detecting SQL injection vulnerability

**Look for:**
- `🔒 **Security Audit:**`
- SQL Injection: HIGH RISK
- Security score (should be low, like 3-4/10)

---

### Test 4: Security Audit - XSS Vulnerability (Khmer) 🔒
**Purpose:** Test XSS detection in Khmer

```bash
curl -X POST https://konkmeng.onrender.com/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "document.getElementById(\"output\").innerHTML = userInput;",
    "language": "JavaScript",
    "responseLang": "km"
  }'
```

**Expected:** Security audit detecting XSS vulnerability in Khmer

**Look for:**
- XSS detection in Khmer
- Security score (should be low)

---

### Test 5: Cache Test - First Request (Cache MISS) 💾
**Purpose:** Test cache miss on first request

```bash
curl -X POST https://konkmeng.onrender.com/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "console.log(\"Hello Production\");",
    "language": "JavaScript",
    "responseLang": "km"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "analysis": "...",
  "responseLanguage": "km",
  "status": "វិភាគរួចរាល់",
  "cached": false
}
```

**Note:** `cached: false` indicates this was a fresh API call

---

### Test 6: Cache Test - Second Request (Cache HIT) 💾
**Purpose:** Test cache hit on duplicate request

```bash
# Run the EXACT same request again
curl -X POST https://konkmeng.onrender.com/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "console.log(\"Hello Production\");",
    "language": "JavaScript",
    "responseLang": "km"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "analysis": "...",
  "responseLanguage": "km",
  "status": "វិភាគរួចរាល់",
  "cached": true,
  "cacheKey": "a1b2c3d4..."
}
```

**Note:** `cached: true` indicates this was served from Redis cache

---

### Test 7: Clean Code (High Security Score) ✅
**Purpose:** Test security audit with secure code

```bash
curl -X POST https://konkmeng.onrender.com/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const greeting = \"Hello\";\nconsole.log(greeting);",
    "language": "JavaScript",
    "responseLang": "en"
  }'
```

**Expected:** High security score (8-10/10)

**Look for:**
- No vulnerabilities found
- High security score
- Positive feedback

---

### Test 8: Multiple Vulnerabilities (Khmer) 🔒
**Purpose:** Test detection of multiple security issues

```bash
curl -X POST https://konkmeng.onrender.com/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const apiKey = \"sk-test123\";\nconst query = \"SELECT * FROM users WHERE name = \" + userName;\ndocument.innerHTML = userInput;",
    "language": "JavaScript",
    "responseLang": "km"
  }'
```

**Expected:** Detection of all three vulnerabilities in Khmer:
- Hardcoded secret
- SQL Injection
- XSS

**Security Score:** Should be very low (1-2/10)

---

### Test 9: Python Code Analysis (English) 🐍
**Purpose:** Test with different programming language

```bash
curl -X POST https://konkmeng.onrender.com/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "password = \"admin123\"\nquery = f\"SELECT * FROM users WHERE id = {user_id}\"",
    "language": "Python",
    "responseLang": "en"
  }'
```

**Expected:** Security audit for Python code

---

### Test 10: Performance Test (Response Time) ⚡
**Purpose:** Measure response times

```bash
# First request (Cache MISS)
time curl -X POST https://konkmeng.onrender.com/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "let x = 10;",
    "language": "JavaScript",
    "responseLang": "km"
  }'

# Second request (Cache HIT)
time curl -X POST https://konkmeng.onrender.com/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "let x = 10;",
    "language": "JavaScript",
    "responseLang": "km"
  }'
```

**Expected:**
- First request: 3-5 seconds (Gemini API call)
- Second request: <1 second (Redis cache)

---

## 📊 Test Results Template

| Test | Status | Response Time | Notes |
|------|--------|---------------|-------|
| 1. Health Check | ⏳ | - | - |
| 2. Hardcoded Secret (KM) | ⏳ | - | - |
| 3. SQL Injection (EN) | ⏳ | - | - |
| 4. XSS Detection (KM) | ⏳ | - | - |
| 5. Cache MISS | ⏳ | - | - |
| 6. Cache HIT | ⏳ | - | - |
| 7. Clean Code | ⏳ | - | - |
| 8. Multiple Vulnerabilities | ⏳ | - | - |
| 9. Python Code | ⏳ | - | - |
| 10. Performance | ⏳ | - | - |

---

## 🔍 What to Check

### Response Structure:
```json
{
  "success": true,
  "analysis": "... (with 🔒 Security Audit section) ...",
  "responseLanguage": "km" or "en",
  "status": "វិភាគរួចរាល់" or "Analysis complete",
  "cached": true or false,
  "cacheKey": "..." (only if cached)
}
```

### Security Audit Format (Khmer):
```
🔒 **ការត្រួតពិនិត្យសុវត្ថិភាព:**
- **SQL Injection:** [status]
- **XSS (Cross-Site Scripting):** [status]
- **ពាក្យសម្ងាត់ដាក់ក្នុងកូដ:** [status]
- **ចំណុចសុវត្ថិភាពផ្សេងៗ:** [status]
- **ពិន្ទុសុវត្ថិភាព:** X/១០ ([reason])
```

### Security Audit Format (English):
```
🔒 **Security Audit:**
- **SQL Injection:** [status]
- **XSS (Cross-Site Scripting):** [status]
- **Hardcoded Secrets:** [status]
- **Other Security Issues:** [status]
- **Security Score:** X/10 ([reason])
```

---

## 🎯 Success Criteria

### Must Have:
- ✅ Server responds to all requests
- ✅ Security audit appears in all responses
- ✅ Khmer responses are 100% natural
- ✅ English responses are clear
- ✅ Security scores are accurate
- ✅ Cache works (if Redis installed)

### Performance:
- ✅ Cache MISS: 3-5 seconds
- ✅ Cache HIT: <1 second
- ✅ No timeouts
- ✅ No errors

### Security:
- ✅ Detects SQL Injection
- ✅ Detects XSS
- ✅ Detects hardcoded secrets
- ✅ Provides accurate scores
- ✅ Gives helpful recommendations

---

## 🚀 Quick Test Script

Save this as `test-production.sh`:

```bash
#!/bin/bash

PROD_URL="https://konkmeng.onrender.com"

echo "🧪 Testing Production Server..."
echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
curl -s $PROD_URL/api/health | python3 -m json.tool
echo ""
echo "---"
echo ""

# Test 2: Security Audit (Khmer)
echo "Test 2: Security Audit - Hardcoded Secret (Khmer)"
curl -s -X POST $PROD_URL/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{"code":"const apiKey=\"sk-test123\";","language":"JavaScript","responseLang":"km"}' \
  | python3 -m json.tool | head -50
echo ""
echo "---"
echo ""

# Test 3: Security Audit (English)
echo "Test 3: Security Audit - SQL Injection (English)"
curl -s -X POST $PROD_URL/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{"code":"const query=\"SELECT * FROM users WHERE id=\"+userId;","language":"JavaScript","responseLang":"en"}' \
  | python3 -m json.tool | head -50
echo ""
echo "---"
echo ""

# Test 4: Cache Test
echo "Test 4: Cache Test (First Request)"
curl -s -X POST $PROD_URL/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{"code":"console.log(\"test\");","language":"JavaScript","responseLang":"km"}' \
  | python3 -m json.tool | grep -E "(success|cached)"
echo ""

echo "Test 4: Cache Test (Second Request)"
curl -s -X POST $PROD_URL/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{"code":"console.log(\"test\");","language":"JavaScript","responseLang":"km"}' \
  | python3 -m json.tool | grep -E "(success|cached)"
echo ""

echo "✅ Production tests complete!"
```

**Run with:**
```bash
chmod +x test-production.sh
./test-production.sh
```

---

## 📝 Notes

1. **Redis on Production:**
   - Check if Redis is installed on Render.com
   - If not, caching won't work but server will still function
   - Consider adding Redis add-on for production

2. **MongoDB:**
   - Verify MongoDB connection is working
   - Check if credentials are correct

3. **Gemini API:**
   - Ensure API key is valid
   - Check quota limits
   - Monitor usage

4. **Response Times:**
   - First request may be slower (cold start)
   - Subsequent requests should be faster
   - Cache hits should be very fast

---

## 🎉 Ready to Test!

Run the tests above and verify:
- ✅ All endpoints respond
- ✅ Security audits work
- ✅ Khmer language is natural
- ✅ Cache works (if Redis available)
- ✅ No errors or crashes

**Good luck with your production testing!** 🚀
