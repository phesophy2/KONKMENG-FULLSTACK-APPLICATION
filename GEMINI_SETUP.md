# 🚀 Google Gemini API Setup Guide

## ✅ Refactoring Complete

Your backend has been successfully refactored to use **Google Gemini API** instead of Groq API.

## 🔑 Get Your Gemini API Key

1. Visit: https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

## ⚙️ Configuration

Update your `.env` file with your actual Gemini API key:

```env
GEMINI_API_KEY=YOUR_ACTUAL_GEMINI_API_KEY_HERE
```

Replace `YOUR_ACTUAL_GEMINI_API_KEY_HERE` with the key you copied from Google AI Studio.

## 🎯 What Changed

### 1. **Package Updates**
- ✅ Added `@google/generative-ai` package
- ✅ Removed Groq API dependency

### 2. **API Configuration**
- ✅ Replaced Groq API with Google Gemini API
- ✅ Using `gemini-1.5-flash` (fast) and `gemini-1.5-pro` (powerful) models
- ✅ Updated environment variable from `GROQ_API_KEY` to `GEMINI_API_KEY`

### 3. **System Prompt Optimization**
The system prompt has been **strictly optimized for Khmer language**:

#### Khmer Language (responseLang: 'km'):
- 100% natural Khmer responses
- Uses everyday Khmer vocabulary
- Clear, simple explanations for beginners
- Structured format with emojis for better readability
- Includes additional tips section

#### English Language (responseLang: 'en'):
- 100% English responses
- Simple, everyday language
- Clear explanations suitable for beginners
- Structured format matching Khmer version

### 4. **Model Fallback Strategy**
The system tries models in this order:
1. `gemini-1.5-flash` - Fast responses
2. `gemini-1.5-pro` - More powerful for complex code

## 📡 API Endpoint

The `/api/analyze-code` route remains the same:

```javascript
POST /api/analyze-code
Content-Type: application/json

{
  "code": "your code here",
  "language": "JavaScript",
  "responseLang": "km"  // or "en"
}
```

## 🧪 Testing

Start your server:
```bash
npm start
```

Check health endpoint:
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "✅ KONKMENG is running",
  "message": "Full-stack with Authentication",
  "version": "4.0 (with Gemini AI)",
  "apiKey": "✅ Configured",
  "mongodb": "✅ Connected"
}
```

## 📝 Response Format

### Khmer Response Example:
```
📝 **កូដដែលត្រូវពិនិត្យ:**
*បន្ទាត់ទី 1: console.log("Hello")

🔧 **បញ្ហាដែលរកឃើញ:**
- មិនមានបញ្ហាអ្វីទេ កូដនេះដំណើរការបានល្អ

✅ **កូដដែលបានកែប្រែ:**
```javascript
console.log("Hello");
```

📖 **ការពន្យល់លម្អិត:**
*បន្ទាត់ទី 1: បង្ហាញពាក្យ "Hello" នៅលើអេក្រង់

💡 **ចំណេះដឹងបន្ថែម:**
console.log() គឺជាមុខងារសម្រាប់បង្ហាញលទ្ធផល
```

## 🎨 Key Features

- ✅ **100% Khmer Language Support** - Natural, everyday Khmer
- ✅ **Beginner-Friendly** - Simple explanations
- ✅ **Structured Format** - Easy to read with emojis
- ✅ **Code Examples** - Practical demonstrations
- ✅ **Additional Tips** - Helpful extra information
- ✅ **Bilingual** - Supports both Khmer and English

## 🔒 Security

- API key stored securely in `.env` file
- Never commit `.env` to version control
- JWT authentication for user-specific features

## 📚 Documentation

- Google Gemini API: https://ai.google.dev/docs
- Package Documentation: https://www.npmjs.com/package/@google/generative-ai

---

**Need Help?** Check the console logs for detailed debugging information.
