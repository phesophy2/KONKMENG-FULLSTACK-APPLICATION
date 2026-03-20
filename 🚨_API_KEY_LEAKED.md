# 🚨 URGENT: API Key Leaked - Action Required

**Date**: March 20, 2026  
**Status**: 🔴 CRITICAL - API Key Disabled by Google  
**Impact**: All Gemini API calls are failing

---

## ❌ Problem

Your current Gemini API key has been reported as **leaked** and has been **disabled by Google**:

```
API Key: AIzaSyBCmnf3Oq0mHzul4B7qutBLNd9GuhhCt3U
Status: ❌ DISABLED (PERMISSION_DENIED)
Error: "Your API key was reported as leaked. Please use another API key."
```

This is why all code analysis requests are failing with 404 errors.

---

## ✅ Solution (3 Steps)

### Step 1: Create New API Key

1. Visit: https://aistudio.google.com/apikey
2. Click "Create API Key"
3. Select your Google Cloud project (or create new one)
4. Copy the new API key

### Step 2: Delete Old API Key

1. In Google AI Studio, find the old key: `AIzaSyBCmnf3Oq0mHzul4B7qutBLNd9GuhhCt3U`
2. Click "Delete" to remove it permanently
3. This prevents further security issues

### Step 3: Update `.env` File

Replace the old API key in your `.env` file:

```env
# OLD (LEAKED - DO NOT USE)
# GEMINI_API_KEY=AIzaSyBCmnf3Oq0mHzul4B7qutBLNd9GuhhCt3U

# NEW (Replace with your new key)
GEMINI_API_KEY=YOUR_NEW_API_KEY_HERE
```

---

## 🔒 Security Best Practices

### Why Did This Happen?

API keys can be leaked through:
- Committing `.env` files to Git
- Sharing code with API keys in it
- Public GitHub repositories
- Documentation files with real keys
- Log files or error messages

### How to Prevent Future Leaks

1. **Never commit `.env` files**
   ```bash
   # Add to .gitignore
   echo ".env" >> .gitignore
   ```

2. **Use environment variables in production**
   - Render.com: Use Environment Variables section
   - Never hardcode API keys in code

3. **Rotate keys regularly**
   - Create new keys every 3-6 months
   - Delete old keys immediately

4. **Use API key restrictions**
   - Restrict by IP address (production server only)
   - Restrict by HTTP referrer (for web apps)
   - Set usage quotas

---

## 🧪 Test New API Key

After updating `.env`, test the new key:

```bash
# Test 1: Check if key is valid
curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_NEW_KEY" | python3 -m json.tool | head -20

# Test 2: Restart server
npm start

# Test 3: Test code analysis
curl -X POST http://localhost:3000/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{"code":"const x = 1;","language":"JavaScript","responseLang":"km"}'
```

---

## 📋 Checklist

- [ ] Created new API key at https://aistudio.google.com/apikey
- [ ] Deleted old leaked key
- [ ] Updated `.env` file with new key
- [ ] Added `.env` to `.gitignore`
- [ ] Tested new key with curl command
- [ ] Restarted server with `npm start`
- [ ] Verified code analysis works
- [ ] Configured API key restrictions (optional but recommended)

---

## 🎯 Expected Result

After completing these steps, you should see:

```bash
npm start

# Output should show:
✅ Redis connected successfully to 127.0.0.1:6379
🔑 GEMINI_API_KEY exists: true
✅ Ready! Server is waiting for requests...

# Test should succeed:
curl -X POST http://localhost:3000/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{"code":"const x = 1;","language":"JavaScript","responseLang":"km"}'

# Response:
{
  "success": true,
  "analysis": "...",
  "model": "gemini-1.5-flash",
  "message": "វិភាគជោគជ័យ"
}
```

---

## 💡 Recommended Model Names

Once you have a new API key, use these model names (they work with most API keys):

```javascript
const GEMINI_MODELS = [
    'gemini-1.5-flash',  // Primary: Fast and efficient
    'gemini-1.5-pro',    // Fallback: Higher quality
    'gemini-pro'         // Last resort: Legacy stable
];
```

---

## 📞 Need Help?

If you encounter issues:

1. **Check API key status**: Visit https://aistudio.google.com/apikey
2. **Verify quota**: Check your usage limits
3. **Test with curl**: Use the test commands above
4. **Check server logs**: Look for detailed error messages

---

**Status**: 🔴 BLOCKED - Waiting for new API key  
**Priority**: 🚨 URGENT - Server cannot analyze code without valid API key  
**Next Action**: Create new API key and update `.env` file

**Last Updated**: March 20, 2026
