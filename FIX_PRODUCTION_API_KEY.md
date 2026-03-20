# ⚠️ Fix Production API Key

## 🔍 Issue Detected

**Problem:** GEMINI_API_KEY is not configured in production  
**Status:** Version 5.0 deployed ✅ but API key missing ❌

---

## 🔧 Quick Fix (5 minutes)

### Step 1: Go to Render Dashboard
Visit: https://dashboard.render.com/

### Step 2: Select Your Service
Click on your "konkmeng" service

### Step 3: Go to Environment
Click "Environment" in the left sidebar

### Step 4: Add GEMINI_API_KEY
Click "Add Environment Variable"

**Key:** `GEMINI_API_KEY`  
**Value:** `AIzaSyBCmnf3Oq0mHzul4B7qutBLNd9GuhhCt3U`

### Step 5: Save Changes
Click "Save Changes"

### Step 6: Redeploy (Automatic)
Render will automatically redeploy with the new environment variable

### Step 7: Wait 2 Minutes
Wait for the redeploy to complete

### Step 8: Test Again
```bash
curl https://konkmeng.onrender.com/api/health
```

**Expected:**
```json
{
  "apiKey": "✅ Configured"
}
```

---

## 🧪 Test After Fix

### Test 1: Health Check
```bash
curl https://konkmeng.onrender.com/api/health
```

**Look for:** `"apiKey": "✅ Configured"`

### Test 2: Security Audit (Khmer)
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

### Test 3: Security Audit (English)
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

## 📋 All Environment Variables Needed

Make sure these are set in Render:

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://User_konkemng:EF86zVY6Ct2uMW79@cluster0.emzmt4w.mongodb.net/konkmen?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=konkmen2026superSecretKeyPheSophyMaster
GEMINI_API_KEY=AIzaSyBCmnf3Oq0mHzul4B7qutBLNd9GuhhCt3U
APP_URL=https://konkmeng.onrender.com
GOOGLE_CLIENT_ID=288817925196-gcql2voharhlbtmppnta0038btq8c7em.apps.googleusercontent.com
GITHUB_CLIENT_ID=Ov23lidnwM2ui7Rq7lhj
GITHUB_CLIENT_SECRET=YOUR_ACTUAL_GITHUB_SECRET_HERE
BREVO_API_KEY=YOUR_BREVO_API_KEY_HERE
SENDER_EMAIL=sophyphe262@gmail.com
```

**Optional (for Redis caching):**
```env
REDIS_URL=redis://localhost:6379
```

---

## ✅ After Adding API Key

Your production will have:
- ✅ Version 5.0 deployed
- ✅ GEMINI_API_KEY configured
- ✅ Security audit working
- ✅ Redis caching (if Redis add-on installed)
- ✅ All features functional

---

## 🎯 Quick Steps Summary

1. Go to https://dashboard.render.com/
2. Click your service
3. Click "Environment"
4. Add `GEMINI_API_KEY` = `AIzaSyBCmnf3Oq0mHzul4B7qutBLNd9GuhhCt3U`
5. Save
6. Wait 2 minutes
7. Test: `curl https://konkmeng.onrender.com/api/health`

---

## 🎉 Almost There!

Version 5.0 is deployed successfully! Just add the API key and you're done! 🚀
