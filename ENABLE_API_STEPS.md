# 🔧 Enable Generative Language API - Step by Step

## ⚠️ Current Issue

Error shows: **"limit: 0"** for free tier quotas

This means the **Generative Language API is not enabled** in your Google Cloud project yet.

## ✅ Solution: Enable the API (2 Minutes)

### Step 1: Go to API Library
Visit this direct link:
```
https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com?project=windy-territory-489518-a9
```

Or manually:
1. Go to: https://console.cloud.google.com/
2. Select project: **windy-territory-489518-a9**
3. Click "APIs & Services" → "Library"
4. Search for "Generative Language API"

### Step 2: Enable the API
1. Click on "Generative Language API"
2. Click the blue **"ENABLE"** button
3. Wait 10-30 seconds for activation

### Step 3: Verify Quotas
1. Go to: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas?project=windy-territory-489518-a9
2. You should see quotas like:
   - Generate requests per minute: 15
   - Generate requests per day: 1,500
   - Input tokens per minute: 1,000,000

### Step 4: Test Again!
After enabling, wait 1 minute then test:

```bash
curl -X POST http://localhost:3000/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "let x = 10",
    "language": "JavaScript",
    "responseLang": "km"
  }'
```

## 🎯 Quick Links

### Direct Links for Your Project:

1. **Enable API:**
   https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com?project=windy-territory-489518-a9

2. **Check Quotas:**
   https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas?project=windy-territory-489518-a9

3. **API Dashboard:**
   https://console.cloud.google.com/apis/dashboard?project=windy-territory-489518-a9

4. **Billing (if needed):**
   https://console.cloud.google.com/billing?project=windy-territory-489518-a9

## 📋 Checklist

- [ ] Go to API Library
- [ ] Search "Generative Language API"
- [ ] Click "Enable"
- [ ] Wait 30 seconds
- [ ] Verify quotas are showing (not 0)
- [ ] Test the endpoint
- [ ] Celebrate! 🎉

## 🔍 Troubleshooting

### If API is already enabled but still shows limit: 0

1. **Check Billing:**
   - Even free tier needs billing account linked
   - Go to: https://console.cloud.google.com/billing
   - Link a billing account (won't be charged for free tier)

2. **Wait for Propagation:**
   - After enabling, wait 1-2 minutes
   - Quotas need time to activate

3. **Verify Project:**
   - Make sure you're in the right project: **windy-territory-489518-a9**
   - Check project dropdown at top of console

4. **Try Different Model:**
   - Some models might activate faster
   - Try gemini-2.5-flash or gemini-2.0-flash-lite

## 💡 Expected Result

After enabling the API, you should see:

### Success Response (Khmer):
```json
{
  "success": true,
  "analysis": "📝 **កូដដែលត្រូវពិនិត្យ:**\n*បន្ទាត់ទី 1: let x = 10\n\n🔧 **បញ្ហាដែលរកឃើញ:**\n- មិនមានបញ្ហាអ្វីទេ កូដនេះត្រឹមត្រូវ\n\n✅ **កូដដែលបានកែប្រែ:**\n```javascript\nlet x = 10;\n```\n\n📖 **ការពន្យល់លម្អិត:**\n*បន្ទាត់ទី 1: នេះជាការប្រកាសអថេរ x ដែលមានតម្លៃ 10\n- let គឺជា keyword សម្រាប់ប្រកាសអថេរដែលអាចផ្លាស់ប្តូរតម្លៃបាន\n- x គឺជាឈ្មោះអថេរ\n- 10 គឺជាតម្លៃដែលយើងផ្តល់ឱ្យ\n\n💡 **ចំណេះដឹងបន្ថែម:**\nក្នុង JavaScript យើងមាន 3 វិធីប្រកាសអថេរ៖\n- let: សម្រាប់អថេរដែលអាចផ្លាស់ប្តូរ\n- const: សម្រាប់តម្លៃថេរ (មិនអាចផ្លាស់ប្តូរ)\n- var: វិធីចាស់ (មិនសូវប្រើទៀតទេ)",
  "responseLanguage": "km",
  "status": "វិភាគរួចរាល់"
}
```

## 🎉 Next Steps

Once the API is enabled and working:

1. **Test with different code examples**
2. **Try both Khmer and English responses**
3. **Integrate with your frontend**
4. **Monitor usage in dashboard**
5. **Enjoy natural Khmer code explanations!**

---

**The code is ready. Just enable the API and you're live!** 🚀
