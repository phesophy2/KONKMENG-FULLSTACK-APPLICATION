# 🚀 PRODUCTION DEPLOYMENT GUIDE

**Date:** March 20, 2026  
**Version:** KONKMENG AI v5.1 | Groq Edition  
**Status:** Ready for Production

---

## ✅ CHANGES PUSHED TO GITHUB

**Branch:** `v5-with-original-ui`  
**Commit:** `ee6146d`  
**Repository:** https://github.com/phyyyy343434/KONKMENG-FULLSTACK-APPLICATION

### Files Changed:
- ✅ `server.js` - Groq API integration + Styled responses
- ✅ `package.json` - Removed Gemini, kept Groq SDK
- ✅ `package-lock.json` - Updated dependencies
- ✅ `test-groq-api.sh` - API testing script
- ✅ `test-styled-response.html` - HTML demo

---

## 🔧 RENDER DEPLOYMENT STEPS

### Step 1: Update Environment Variables

Go to Render Dashboard → Your Service → Environment

**Add/Update these variables:**

```env
# CRITICAL: Add Groq API Key
GROQ_API_KEY=gsk_YOUR_ACTUAL_GROQ_API_KEY_HERE

# Keep existing variables
NODE_ENV=production
MONGODB_URI=mongodb+srv://User_konkemng:EF86zVY6Ct2uMW79@cluster0.emzmt4w.mongodb.net/konkmen?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=konkmen2026superSecretKeyPheSophyMaster
APP_URL=https://konkmeng.onrender.com
GOOGLE_CLIENT_ID=288817925196-gcql2voharhlbtmppnta0038btq8c7em.apps.googleusercontent.com
GITHUB_CLIENT_ID=Ov23lidnwM2ui7Rq7lhj
GITHUB_CLIENT_SECRET=YOUR_ACTUAL_GITHUB_SECRET_HERE
BREVO_API_KEY=YOUR_BREVO_API_KEY_HERE
SENDER_EMAIL=sophyphe262@gmail.com

# Optional: Redis (if using external Redis)
# REDIS_URL=redis://your-redis-url:6379
```

**IMPORTANT:** Remove old Gemini variables if they exist:
- ❌ Delete `GEMINI_API_KEY` (no longer needed)

### Step 2: Deploy from GitHub

**Option A: Auto-Deploy (Recommended)**
1. Go to Render Dashboard
2. Click on your service
3. Go to "Settings" tab
4. Under "Build & Deploy"
5. Set Branch: `v5-with-original-ui`
6. Enable "Auto-Deploy": Yes
7. Click "Save Changes"
8. Render will automatically deploy

**Option B: Manual Deploy**
1. Go to Render Dashboard
2. Click on your service
3. Click "Manual Deploy" button
4. Select branch: `v5-with-original-ui`
5. Click "Deploy"

### Step 3: Monitor Deployment

Watch the deployment logs:
```
Building...
Installing dependencies...
npm install
✅ groq-sdk installed
❌ @google/generative-ai removed
Starting server...
✅ Server started on port 3000
```

Expected logs:
```
🔍 ===== KONKMENG AI SYSTEM v5.1 | Groq Edition =====
🔑 GROQ_API_KEY exists: true
🤖 AI_ENGINE: Groq (Llama 3.3 70B Versatile)
✅ MongoDB connected successfully
🚀 KONKMENG v5.1 | Groq Edition running on http://localhost:3000
```

### Step 4: Verify Deployment

**Test Health Endpoint:**
```bash
curl https://konkmeng.onrender.com/api/health
```

Expected response:
```json
{
  "status": "✅ KONKMENG is running",
  "version": "5.1 | Groq Edition",
  "engine": "Groq Llama 3.3 70B Versatile | Ultra-Fast Performance",
  "apiKey": "✅ Configured",
  "groqModel": {
    "name": "llama-3.3-70b-versatile"
  }
}
```

**Test Code Analysis:**
```bash
curl -X POST https://konkmeng.onrender.com/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function hello() { console.log(\"Hello\"); }",
    "language": "javascript",
    "responseLang": "km"
  }'
```

Expected: Styled response with boxes and emojis ✅

---

## 🔍 TROUBLESHOOTING

### Issue 1: "GROQ_API_KEY not configured"
**Solution:** Add `GROQ_API_KEY` to Render environment variables

### Issue 2: Build fails with "Cannot find module 'groq-sdk'"
**Solution:** 
1. Check `package.json` has `"groq-sdk": "^1.1.1"`
2. Trigger rebuild in Render

### Issue 3: Old Gemini errors in logs
**Solution:**
1. Clear build cache in Render
2. Redeploy from scratch

### Issue 4: MongoDB connection failed
**Solution:** Check `MONGODB_URI` password is correct

### Issue 5: Redis not connecting
**Solution:** Redis is optional - server works without it (graceful degradation)

---

## 📊 DEPLOYMENT CHECKLIST

### Pre-Deployment
- [x] Code pushed to GitHub
- [x] Branch: `v5-with-original-ui`
- [x] Dependencies updated
- [x] Groq API tested locally
- [x] Styled responses tested

### Render Configuration
- [ ] Add `GROQ_API_KEY` to environment
- [ ] Remove `GEMINI_API_KEY` (if exists)
- [ ] Set branch to `v5-with-original-ui`
- [ ] Enable auto-deploy
- [ ] Save changes

### Post-Deployment
- [ ] Check deployment logs
- [ ] Test health endpoint
- [ ] Test code analysis (English)
- [ ] Test code analysis (Khmer)
- [ ] Verify styled responses
- [ ] Check Groq stats endpoint

---

## 🎯 EXPECTED IMPROVEMENTS

### Performance
- ⚡ 2-3x faster responses
- ⚡ No retry delays
- ⚡ Higher rate limits (30 req/min vs 20 req/day)

### User Experience
- 🎨 Beautiful styled responses
- 🎨 Color-coded sections
- 🎨 Usage examples
- 🎨 Professional appearance

### Reliability
- 🔒 No quota exceeded errors
- 🔒 Single reliable model
- 🔒 Simpler error handling

### Cost
- 💰 More affordable than Gemini
- 💰 Better rate limits
- 💰 Redis caching saves tokens

---

## 📱 TESTING PRODUCTION

### Test URLs

**Health Check:**
```
https://konkmeng.onrender.com/api/health
```

**Code Analysis:**
```
https://konkmeng.onrender.com/api/analyze-code
```

**Model Stats:**
```
https://konkmeng.onrender.com/api/model-stats
```

**Frontend:**
```
https://konkmeng.onrender.com
```

### Test Commands

**1. Health Check:**
```bash
curl https://konkmeng.onrender.com/api/health | jq
```

**2. Khmer Analysis:**
```bash
curl -X POST https://konkmeng.onrender.com/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function test() { return 42; }",
    "language": "javascript",
    "responseLang": "km"
  }' | jq -r '.analysis'
```

**3. English Analysis:**
```bash
curl -X POST https://konkmeng.onrender.com/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "def greet(name):\n    print(f\"Hello {name}\")",
    "language": "python",
    "responseLang": "en"
  }' | jq -r '.analysis'
```

**4. Check Stats:**
```bash
curl https://konkmeng.onrender.com/api/model-stats | jq
```

---

## 🚨 ROLLBACK PLAN

If something goes wrong:

### Option 1: Revert to Previous Branch
1. Go to Render Dashboard
2. Settings → Build & Deploy
3. Change branch to previous stable branch
4. Click "Save Changes"
5. Render will auto-deploy old version

### Option 2: Revert Git Commit
```bash
git revert ee6146d
git push origin v5-with-original-ui
```

### Option 3: Use Previous Commit
1. Find previous working commit
2. Deploy from that commit in Render

---

## 📊 MONITORING

### Key Metrics to Watch

**1. Response Time**
- Target: < 2 seconds
- Monitor: Render logs

**2. Error Rate**
- Target: < 1%
- Monitor: `/api/model-stats`

**3. Groq Token Usage**
- Limit: 30 req/min
- Monitor: Groq Console

**4. Cache Hit Rate**
- Target: > 30%
- Monitor: Server logs

### Render Dashboard
- CPU usage
- Memory usage
- Request count
- Error logs

### Groq Console
- https://console.groq.com
- Token usage
- Rate limits
- API status

---

## 🎉 SUCCESS INDICATORS

✅ Deployment successful if:
1. Health check returns "Groq Edition"
2. Code analysis works in both languages
3. Responses have styled format
4. No Gemini errors in logs
5. Groq stats show success count
6. Response time < 2 seconds
7. No 500 errors

---

## 📞 SUPPORT

**Groq Issues:**
- Console: https://console.groq.com
- Docs: https://console.groq.com/docs
- Status: https://status.groq.com

**Render Issues:**
- Dashboard: https://dashboard.render.com
- Docs: https://render.com/docs
- Support: support@render.com

**GitHub:**
- Repository: https://github.com/phyyyy343434/KONKMENG-FULLSTACK-APPLICATION
- Branch: v5-with-original-ui

---

## 🎯 NEXT STEPS AFTER DEPLOYMENT

1. **Monitor for 24 hours**
   - Check error logs
   - Monitor response times
   - Watch token usage

2. **Gather user feedback**
   - Response styling
   - Performance
   - Accuracy

3. **Optimize if needed**
   - Adjust Redis TTL
   - Fine-tune prompts
   - Add more features

4. **Document learnings**
   - What worked well
   - What needs improvement
   - Future enhancements

---

**Deployment Date:** March 20, 2026  
**Deployed By:** Kiro AI Assistant  
**Version:** KONKMENG AI v5.1 | Groq Edition  
**Status:** 🚀 READY FOR PRODUCTION DEPLOYMENT
