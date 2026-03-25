# 🧠 AI PROMPT LIBRARY

**KONKMENG AI Code Analysis System - Internal Documentation**

Version 1.0 | March 2026

---

## 📋 TABLE OF CONTENTS

1. [What is This Document?](#what-is-this-document)
2. [Why Do We Need AI Prompts?](#why-do-we-need-ai-prompts)
3. [How KONKMENG Uses AI Prompts](#how-konkmeng-uses-ai-prompts)
4. [The Two Main Prompts](#the-two-main-prompts)
5. [Prompt Engineering Techniques](#prompt-engineering-techniques)
6. [Real Example: How It Works](#real-example-how-it-works)
7. [Technical Implementation](#technical-implementation)

---

## 🤔 WHAT IS THIS DOCUMENT?

This document is the **"brain"** of KONKMENG's AI system. It contains the **secret instructions** (called "prompts") that tell the AI how to analyze code and respond to users.

Think of it like this:
- **Without prompts**: AI gives random, inconsistent answers
- **With prompts**: AI gives structured, professional, bilingual answers

### Simple Analogy

Imagine you hire a teacher to explain code to students:

| Without Instructions | With Instructions (Prompts) |
|---------------------|----------------------------|
| Teacher explains randomly | Teacher follows a lesson plan |
| Sometimes in English, sometimes Khmer | Always in the language student chose |
| No structure | Clear sections: Summary → Errors → Fixed Code → Explanation |
| Inconsistent quality | Professional, consistent quality |

**This document = The lesson plan for our AI teacher**

---

## 💡 WHY DO WE NEED AI PROMPTS?

### Problem Without Prompts

If you just send code to AI without instructions:

```
User: "Explain this code: console.log('hello')"
AI: "This code prints hello to the console."
```

❌ Too short  
❌ No error detection  
❌ No line-by-line explanation  
❌ Not in Khmer  
❌ No structure  

### Solution With Prompts

With our custom prompts:

```
User: "Explain this code: console.log('hello')" [Language: Khmer]
AI: 
🎯 សង្ខេបកូដ
កូដនេះបង្ហាញសារ "hello" នៅលើ console

🔍 វិភាគបច្ចេកទេស
• កូដត្រឹមត្រូវ

✅ កូដដែលកែប្រែរួច
```javascript
console.log('hello');
```

📖 ពន្យល់បន្ទាត់ម្តងមួយៗ
• **បន្ទាត់ 1:** `console.log('hello')` - បង្ហាញសារ hello នៅលើ console

💡 ជំនាញសម្រាប់សិស្ស
console.log ដូចជាការប្រើ megaphone ដើម្បីប្រកាសសារ
```

✅ Professional  
✅ Structured  
✅ In Khmer  
✅ Line-by-line explanation  
✅ Includes analogy  

---

## 🎯 HOW KONKMENG USES AI PROMPTS

### The Flow

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: User Submits Code                                  │
│  • Code: console.log('hello')                               │
│  • Language: JavaScript                                     │
│  • Response Language: Khmer                                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Server Selects Prompt                              │
│  • If responseLang = 'km' → Use Khmer Prompt               │
│  • If responseLang = 'en' → Use English Prompt             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Server Builds Complete Message                     │
│  • System Prompt: "You are a Khmer programming teacher..."  │
│  • User Prompt: "Explain this JavaScript code..."          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: Send to Groq AI                                    │
│  • AI reads the prompts                                     │
│  • AI follows the instructions                              │
│  • AI generates structured response                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: Return to User                                     │
│  • Formatted in Khmer                                       │
│  • With sections: Summary, Analysis, Fixed Code, etc.       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📚 THE TWO MAIN PROMPTS

KONKMENG has **2 main prompts** - one for Khmer, one for English.

### 1. Khmer Prompt (ប្រព័ន្ធជាភាសាខ្មែរ)

**Purpose**: Explain code in Khmer language with Cambodian cultural context

**Key Features**:
- 100% Khmer language only
- Uses Khmer technical terms
- Structured format with emojis
- Line-by-line explanations
- Real-life analogies in Khmer context

**When Used**: When user selects "ខ្មែរ" in language dropdown

---

### 2. English Prompt (English System)

**Purpose**: Explain code in English with international standards

**Key Features**:
- 100% English language only
- Professional technical terminology
- Same structured format as Khmer
- Line-by-line explanations
- Real-life analogies (library, cooking, building)

**When Used**: When user selects "English" in language dropdown

---

## 🛠️ PROMPT ENGINEERING TECHNIQUES

Our prompts use advanced AI techniques to ensure quality:

### 1. **Role-Based Prompting**

```
"You are a Khmer programming teacher"
```

**Why**: Tells AI to act like a teacher, not just answer questions

**Result**: More educational, patient, detailed responses

---

### 2. **Structured Output Formatting**

```
📋 **RESPONSE FORMAT:**

🎯 សង្ខេបកូដ
[Summary here]

🔍 វិភាគបច្ចេកទេស
[Analysis here]

✅ កូដដែលកែប្រែរួច
[Fixed code here]
```

**Why**: Forces AI to follow exact structure

**Result**: Consistent, predictable responses that match our UI design

---

### 3. **Template Binding**

```
• **បន្ទាត់ 1:** `code` - [explanation]
• **បន្ទាត់ 2:** `code` - [explanation]
```

**Why**: Creates patterns that our frontend can parse and style

**Result**: Beautiful formatting with colors, boxes, syntax highlighting

---

### 4. **Constraint Setting**

```
"Your responses must be 100% in Khmer language only"
"NO REPETITION: Never say the same thing twice"
"MANDATORY: Use real-life analogy"
```

**Why**: Prevents AI from making mistakes

**Result**: High-quality, focused responses

---

### 5. **Few-Shot Learning (Implicit)**

By showing the exact format in the prompt, AI learns the pattern:

```
Example format shown:
• **Line 1:** `code` - [function #1]
• **Line 2:** `code` - [function #2]

AI follows this pattern automatically
```

---

## 📖 REAL EXAMPLE: HOW IT WORKS

### User Input

```javascript
function add(a, b) {
  return a + b
}
```

Language: JavaScript  
Response Language: Khmer

---

### What Happens Behind the Scenes

#### Step 1: Server Creates System Prompt (Khmer)

```
អ្នកគឺជា KONKMENG AI - Senior Developer ដែលបង្រៀនសិស្ស។

**រចនាសម្ព័ន្ធ:**

┌─────────────────────────────────────┐
│  🎯 សង្ខេបកូដ                        │
└─────────────────────────────────────┘

[ពន្យល់ថា កូដនេះធ្វើអ្វី ក្នុង 1-2 ប្រយោគ]

┌─────────────────────────────────────┐
│  🔍 វិភាគបច្ចេកទេស                   │
└─────────────────────────────────────┘

[រកបញ្ហាពិតប៉ុណ្ណោះ។ ប្រសិនគ្មាន សរសេរ "កូដត្រឹមត្រូវ"]

┌─────────────────────────────────────┐
│  ✅ កូដដែលកែប្រែរួច                  │
└─────────────────────────────────────┘

```javascript
[កូដដែលកែប្រែរួច]
```

┌─────────────────────────────────────┐
│  📖 ពន្យល់បន្ទាត់ម្តងមួយៗ              │
└─────────────────────────────────────┘

• **បន្ទាត់ 1:** `code` - [មុខងារ]

┌─────────────────────────────────────┐
│  💡 ជំនាញសម្រាប់សិស្ស                │
└─────────────────────────────────────┘

[ប្រើឧទាហរណ៍ជីវិតពិត]
```

#### Step 2: Server Creates User Prompt

```
ពន្យល់កូដ JavaScript នេះជាភាសាខ្មែរ៖

```javascript
function add(a, b) {
  return a + b
}
```

សូមឆ្លើយតាមទម្រង់ដែលបានកំណត់។
```

#### Step 3: AI Generates Response

```
┌─────────────────────────────────────┐
│  🎯 សង្ខេបកូដ                        │
└─────────────────────────────────────┘

កូដនេះជា function ដែលបូកលេខពីរ (a និង b) ហើយ return លទ្ធផល។

┌─────────────────────────────────────┐
│  🔍 វិភាគបច្ចេកទេស                   │
└─────────────────────────────────────┘

• កូដត្រឹមត្រូវ - គ្មានបញ្ហា

┌─────────────────────────────────────┐
│  ✅ កូដដែលកែប្រែរួច                  │
└─────────────────────────────────────┘

```javascript
function add(a, b) {
  return a + b;
}
```

┌─────────────────────────────────────┐
│  📖 ពន្យល់បន្ទាត់ម្តងមួយៗ              │
└─────────────────────────────────────┘

• **បន្ទាត់ 1:** `function add(a, b) {` - បង្កើត function ឈ្មោះ add ដែលទទួល parameter ពីរ
• **បន្ទាត់ 2:** `return a + b` - បូក a និង b ហើយ return លទ្ធផល
• **បន្ទាត់ 3:** `}` - បិទ function

┌─────────────────────────────────────┐
│  💡 ជំនាញសម្រាប់សិស្ស                │
└─────────────────────────────────────┘

function ដូចជាម៉ាស៊ីនគិតលុយ - អ្នកដាក់លុយចូល (a, b) ហើយវាគណនាផ្តល់លទ្ធផលមកវិញ។

💬 **សន្និដ្ឋាន:** function add គឺជា function សាមញ្ញដែលបូកលេខពីរ។
```

#### Step 4: Frontend Displays

The frontend parses this and displays with:
- Colored boxes
- Syntax highlighting
- Proper spacing
- Icons and emojis

---

## 💻 TECHNICAL IMPLEMENTATION

### Location in Code

File: `server.js`  
Function: `getSystemPrompt(language)`  
Lines: 1223-1350

### How It's Called

```javascript
// In server.js - analyzeCode function

// Step 1: Get the system prompt based on language
const systemPrompt = getSystemPrompt(responseLang);

// Step 2: Create user prompt with actual code
const userPrompt = responseLang === 'km'
    ? `ពន្យល់កូដ ${language} នេះជាភាសាខ្មែរ៖\n\n\`\`\`${language}\n${code}\n\`\`\``
    : `Explain this ${language} code in English:\n\n\`\`\`${language}\n${code}\n\`\`\``;

// Step 3: Send to Groq AI
const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
    model: 'llama-3.3-70b-versatile',
    messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ],
    temperature: 0.2,
    max_tokens: 1500
});
```

---

## 📊 PROMPT COMPARISON

| Feature | Khmer Prompt | English Prompt |
|---------|-------------|----------------|
| **Language** | 100% Khmer | 100% English |
| **Structure** | Same format | Same format |
| **Sections** | 5 sections | 5 sections |
| **Line-by-Line** | ✅ Yes | ✅ Yes |
| **Analogies** | Khmer context | International context |
| **Technical Terms** | Khmer terms | English terms |
| **Emojis** | ✅ Yes | ✅ Yes |
| **Code Blocks** | ✅ Yes | ✅ Yes |

---

## 🎓 WHY THIS MATTERS 

### 1. **Quality Control**

These prompts ensure every response is:
- Professional
- Consistent
- Educational
- Structured

### 2. **Bilingual Support**

Without these prompts, we couldn't offer true bilingual support. The prompts are what make KONKMENG unique.

### 3. **Scalability**

Want to add more languages? Just create new prompts:
- French prompt
- Vietnamese prompt
- Thai prompt

### 4. **Customization**

Want to change the response format? Just edit the prompts:
- Add more sections
- Change the structure
- Adjust the tone

### 5. **Brand Identity**

These prompts define KONKMENG's "personality":
- Educational (like a teacher)
- Patient (explains line-by-line)
- Practical (uses real-life analogies)
- Professional (structured format)

---

## 🔧 ACTUAL PROMPTS IN PRODUCTION

### Khmer System Prompt (Current Production Version)

```javascript
អ្នកគឺជា KONKMENG AI - Senior Developer ដែលបង្រៀនសិស្ស។

**រចនាសម្ព័ន្ធ:**

┌─────────────────────────────────────┐
│  🎯 សង្ខេបកូដ                        │
└─────────────────────────────────────┘

[ពន្យល់ថា កូដនេះធ្វើអ្វី ក្នុង 1-2 ប្រយោគ]

┌─────────────────────────────────────┐
│  🔍 វិភាគបច្ចេកទេស                   │
└─────────────────────────────────────┘

[រកបញ្ហាពិតប៉ុណ្ណោះ។ ប្រសិនគ្មាន សរសេរ "កូដត្រឹមត្រូវ"]

• [បញ្ហាទី១ + មូលហេតុ]
• [បញ្ហាទី២ + ផលប៉ះពាល់]

┌─────────────────────────────────────┐
│  ✅ កូដដែលកែប្រែរួច                  │
└─────────────────────────────────────┘

```${langTag}
[កូដដែលកែប្រែរួច ឬកូដដើមប្រសិនល្អហើយ]
```

┌─────────────────────────────────────┐
│  📖 ពន្យល់បន្ទាត់ម្តងមួយៗ              │
└─────────────────────────────────────┘

• **បន្ទាត់ 1:** `code` - [មុខងារទី១]
• **បន្ទាត់ 2:** `code` - [មុខងារទី២]
• **បន្ទាត់ 3:** `code` - [មុខងារទី៣]

┌─────────────────────────────────────┐
│  💡 ជំនាញសម្រាប់សិស្ស                │
└─────────────────────────────────────┘

[ប្រើឧទាហរណ៍ជីវិតពិត ដូចជា បណ្ណាល័យ, សាងជញ្ជាំង, ធ្វើម្ហូប]

💬 **សន្និដ្ឋាន:** [សង្ខេប 1 ប្រយោគ]
```

---

### English System Prompt (Current Production Version)

```javascript
You are KONKMENG AI v5.3 - Senior Developer mentoring a first-year student.

**CRITICAL RULES:**

1. **NO REPETITION:** Never say the same thing twice. If explained once, don't explain again

2. **DIVERSITY:** In "Line-by-Line Explanation" describe UNIQUE function of each line:
   - Line 1: Input validation
   - Line 2: Array initialization
   - Line 3: Loop processing
   - Line 4: Return result
   [Every line must have different purpose]

3. **ANALOGY MANDATORY:** In "Pro Tip" use real-life analogy:
   - Library (organizing books)
   - Building a wall (brick by brick)
   - Cooking (recipe steps)
   - Driving (traffic rules)

**STRUCTURE:**

┌─────────────────────────────────────┐
│  🎯 Code Summary                     │
└─────────────────────────────────────┘

[Explain what this code does in 1-2 sentences]

┌─────────────────────────────────────┐
│  🔍 Technical Analysis               │
└─────────────────────────────────────┘

[Find real issues only. If none, write "Code is correct"]

• [Issue #1 + Technical reason]
• [Issue #2 + Impact]

┌─────────────────────────────────────┐
│  ✅ Corrected Code                   │
└─────────────────────────────────────┘

```${langTag}
[Improved code OR original if already good]
```

┌─────────────────────────────────────┐
│  📖 Line-by-Line Explanation         │
└─────────────────────────────────────┘

• **Line 1:** `code` - [UNIQUE function #1]
• **Line 2:** `code` - [UNIQUE function #2]
• **Line 3:** `code` - [UNIQUE function #3]

[CRITICAL: Every line must have different purpose]

┌─────────────────────────────────────┐
│  💡 Pro Tip for Students             │
└─────────────────────────────────────┘

[MANDATORY: Use real-life analogy like library, building wall, cooking, driving]

💬 **Conclusion:** [Summary in 1 sentence]
```

---

## 📈 BENEFITS OF THIS SYSTEM

### For Users
✅ Consistent, high-quality responses  
✅ Easy to read and understand  
✅ Educational (not just answers)  
✅ True bilingual support  

### For Developers
✅ Easy to maintain  
✅ Easy to update  
✅ Easy to add new languages  
✅ Predictable AI behavior  

### For Business
✅ Professional brand image  
✅ Unique selling point  
✅ Scalable to new markets  
✅ Quality assurance  

---

## 🎯 SUMMARY FOR CLIENT

**What is AI Prompt Library?**

It's the instruction manual that tells our AI how to respond to users. Without it, AI would give random, inconsistent answers. With it, AI gives professional, structured, bilingual responses.

**Why is it important?**

1. **Quality**: Ensures every response is professional
2. **Consistency**: Same format every time
3. **Bilingual**: Makes Khmer/English switching possible
4. **Brand**: Defines KONKMENG's unique personality
5. **Scalable**: Easy to add more languages

**Real-world analogy:**

Think of KONKMENG as a restaurant:
- **Without prompts**: Chefs cook whatever they want (inconsistent)
- **With prompts**: Chefs follow recipes (consistent, quality food)

The AI Prompt Library = Our recipe book that ensures every dish (response) is perfect.

---

**Version**: 1.0  
**Last Updated**: March 25, 2026  
**Maintained by**: KONKMENG Development Team

---

*This document is for internal use and client education. The prompts are proprietary and represent KONKMENG's competitive advantage in the bilingual AI code analysis market.*
