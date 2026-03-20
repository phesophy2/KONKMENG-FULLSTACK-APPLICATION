# 🚀 Deploy Version 5.0 to Production

## 📊 Current Status

**Local:** Version 5.0 (with Gemini AI + Redis Cache + Security Audit) ✅  
**Production:** Version 3.0 (with Auth) ⚠️ OLD VERSION

**You need to deploy the new version to production!**

---

## 🎯 Deployment Steps

### Option 1: Git Push (Recommended for Render.com)

#### Step 1: Check Git Status
```bash
git status
```

#### Step 2: Add All Changes
```bash
git add .
```

#### Step 3: Commit Changes
```bash
git commit -m "feat: Add Redis caching and advanced security audit v5.0

- Integrate Redis edge caching with 24-hour TTL
- Add SHA-256 hash-based cache keys
- Implement security audit in 100% natural Khmer
- Add SQL Injection, XSS, and secrets detection
- Implement graceful degradation for Redis
- Update to version 5.0"
```

#### Step 4: Push to Production
```bash
git push origin main
# or
git push origin master
```

**Render.com will automatically deploy the new version!**

---

### Option 2: Manual Deployment

If you're not using Git auto-deploy:

#### Step 1: Go to Render Dashboard
Visit: https://dashboard.render.com/

#### Step 2: Find Your Service
- Click on your "konkmeng" service

#### Step 3: Manual Deploy
- Click "Manual Deploy"
- Select "Deploy latest commit"
- Or click "Clear build cache & deploy"

---

## 📦 Pre-Deployment Checklist

### ✅ Files to Deploy:
- [x] server.js (updated with Redis & Security Audit)
- [x] package.json (includes redis dependency)
- [x] .env (with GEMINI_API_KEY)

### ✅ Environment Variables on Render:
Make sure these are set in Render dashboard:

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://User_konkemng:...
JWT_SECRET=konkmen2026superSecretKeyPheSophyMaster
GEMINI_API_KEY=AIzaSyBCmnf3Oq0mHzul4B7qutBLNd9GuhhCt3U
APP_URL=https://konkmeng.onrender.com
REDIS_URL=redis://localhost:6379  # Optional
```

### ✅ Dependencies:
```json
{
  "@google/generative-ai": "^0.21.0",
  "redis": "^4.x.x"
}
```

---

## 🔧 Add Redis to Render (Optional but Recommended)

### Option A: Render Redis Add-on

1. **Go to your service dashboard**
2. **Click "Add-ons" or "Redis"**
3. **Select Redis plan** (Free tier available)
4. **Render will automatically set REDIS_URL**

### Option B: External Redis (Upstash, Redis Cloud)

1. **Sign up for Upstash:** https://upstash.com/
2. **Create Redis database**
3. **Copy connection URL**
4. **Add to Render environment variables:**
   ```
   REDIS_URL=redis://...
   ```

### Option C: No Redis (Graceful Degradation)

Your server will work perfectly without Redis:
- ✅ All features work
- ✅ Security audit works
- ⚠️ No caching (every request calls Gemini API)

---

## 🧪 Post-Deployment Tests

### Test 1: Verify Version
```bash
curl https://konkmeng.onrender.com/api/health
```

**Expected:**
```json
{
  "version": "5.0 (with Gemini AI + Redis Cache + Security Audit)",
  "redis": "✅ Connected" or "❌ Disconnected"
}
```

### Test 2: Test Security Audit (Khmer)
```bash
curl -X POST https://konkmeng.onrender.com/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const apiKey = \"sk-test123\";",
    "language": "JavaScript",
    "responseLang": "km"
  }'
```

**Expected:** Security audit in Khmer with hardcoded secret detection

### Test 3: Test Security Audit (English)
```bash
curl -X POST https://konkmeng.onrender.com/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const query = \"SELECT * FROM users WHERE id = \" + userId;",
    "language": "JavaScript",
    "responseLang": "en"
  }'
```

**Expected:** Security audit in English with SQL injection detection

---

## 📊 Deployment Monitoring

### Check Logs on Render:
1. Go to your service dashboard
2. Click "Logs" tab
3. Look for:
   ```
   🔍 ===== KONKMENG AI SYSTEM =====
   🔑 GEMINI_API_KEY exists: true
   💾 REDIS_CACHE: Initializing...
   🚀 KONKMENG Server running on http://0.0.0.0:10000
   ```

### Expected Logs:
```
✅ MongoDB connected successfully
✅ Redis connected successfully  (if Redis available)
⚠️  Redis connection failed
⚠️  Server will continue without caching  (if no Redis)
✅ Ready! Server is waiting for requests...
```

---

## 🔍 Troubleshooting

### Issue 1: Build Fails
**Error:** `Cannot find module 'redis'`

**Solution:**
```bash
# Make sure package.json includes redis
npm install redis
git add package.json package-lock.json
git commit -m "Add redis dependency"
git push
```

### Issue 2: Gemini API Not Working
**Error:** `API Key not configured`

**Solution:**
1. Check Render environment variables
2. Make sure `GEMINI_API_KEY` is set
3. Redeploy

### Issue 3: Redis Connection Fails
**Error:** `Redis connection failed`

**Solution:**
- This is OK! Server continues without caching
- To enable caching, add Redis add-on
- Or set `REDIS_URL` environment variable

### Issue 4: MongoDB Connection Fails
**Error:** `MongoDB connection error: bad auth`

**Solution:**
1. Check MongoDB credentials
2. Update `MONGODB_URI` in Render
3. Redeploy

---

## 📝 Deployment Checklist

Before deploying:
- [ ] All changes committed to Git
- [ ] package.json includes redis
- [ ] .env has GEMINI_API_KEY
- [ ] Render environment variables updated
- [ ] Local tests passing

After deploying:
- [ ] Health check shows version 5.0
- [ ] Security audit works (Khmer)
- [ ] Security audit works (English)
- [ ] No errors in logs
- [ ] MongoDB connected
- [ ] Redis status checked

---

## 🎯 Quick Deploy Commands

```bash
# 1. Check status
git status

# 2. Add all changes
git add .

# 3. Commit
git commit -m "Deploy v5.0: Redis caching + Security audit"

# 4. Push to production
git push origin main

# 5. Wait for Render to deploy (2-3 minutes)

# 6. Test
curl https://konkmeng.onrender.com/api/health

# 7. Verify version
# Should show: "version": "5.0 (with Gemini AI + Redis Cache + Security Audit)"
```

---

## 🚀 Expected Timeline

1. **Git Push:** 10 seconds
2. **Render Build:** 1-2 minutes
3. **Render Deploy:** 30 seconds
4. **Total:** ~3 minutes

---

## 🎉 Success Indicators

After deployment, you should see:

### Health Endpoint:
```json
{
  "status": "✅ KONKMENG is running",
  "version": "5.0 (with Gemini AI + Redis Cache + Security Audit)",
  "apiKey": "✅ Configured",
  "mongodb": "✅ Connected",
  "redis": "✅ Connected" or "❌ Disconnected"
}
```

### Logs:
```
🔍 ===== KONKMENG AI SYSTEM =====
🔑 GEMINI_API_KEY exists: true
💾 REDIS_CACHE: Initializing...
✅ MongoDB connected successfully
✅ Ready! Server is waiting for requests...
```

### Test Response:
```json
{
  "success": true,
  "analysis": "... 🔒 **ការត្រួតពិនិត្យសុវត្ថិភាព:** ...",
  "responseLanguage": "km",
  "status": "វិភាគរួចរាល់",
  "cached": false
}
```

---

## 📞 Need Help?

### Render Support:
- Documentation: https://render.com/docs
- Community: https://community.render.com/

### Check Deployment Status:
- Dashboard: https://dashboard.render.com/
- Logs: Click your service → "Logs" tab
- Events: Click your service → "Events" tab

---

## ✅ Ready to Deploy!

Run these commands:
```bash
git add .
git commit -m "Deploy v5.0: Redis caching + Security audit"
git push origin main
```

Then wait 3 minutes and test:
```bash
curl https://konkmeng.onrender.com/api/health
```

**Good luck with your deployment!** 🚀🎉
