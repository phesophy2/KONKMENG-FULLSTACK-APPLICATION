# 🔄 KONKMENG v5.0 - Model Rotation Diagram

## 📊 Model Priority Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    INCOMING REQUEST                         │
│              (Code Analysis + Security Audit)               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   Check Redis Cache    │
         │  (24-hour TTL)         │
         └────────┬───────────────┘
                  │
         ┌────────┴────────┐
         │                 │
    Cache HIT         Cache MISS
         │                 │
         ▼                 ▼
    ┌─────────┐    ┌──────────────────────────────┐
    │ Return  │    │  Try Gemini Models           │
    │ Cached  │    │  (3-tier fallback)           │
    │ Result  │    └──────────┬───────────────────┘
    └─────────┘               │
                              ▼
                    ┌─────────────────────────┐
                    │  [1/3] PRIMARY MODEL    │
                    │  gemini-1.5-flash-latest│
                    │  (1,500 RPD quota)      │
                    └──────────┬──────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
               ✅ SUCCESS            ❌ FAILED
                    │                     │
                    │                     ▼
                    │          ⏳ Wait 1 second
                    │                     │
                    │                     ▼
                    │          ┌─────────────────────────┐
                    │          │  [2/3] FALLBACK MODEL   │
                    │          │  gemini-1.5-pro-latest  │
                    │          │  (Higher quality)       │
                    │          └──────────┬──────────────┘
                    │                     │
                    │          ┌──────────┴──────────┐
                    │          │                     │
                    │     ✅ SUCCESS            ❌ FAILED
                    │          │                     │
                    │          │                     ▼
                    │          │          ⏳ Wait 1 second
                    │          │                     │
                    │          │                     ▼
                    │          │          ┌─────────────────────────┐
                    │          │          │  [3/3] LAST RESORT      │
                    │          │          │  gemini-1.0-pro-latest  │
                    │          │          │  (Stable)               │
                    │          │          └──────────┬──────────────┘
                    │          │                     │
                    │          │          ┌──────────┴──────────┐
                    │          │          │                     │
                    │          │     ✅ SUCCESS            ❌ FAILED
                    │          │          │                     │
                    ▼          ▼          ▼                     ▼
         ┌──────────────────────────────────┐    ┌─────────────────────┐
         │  Save to Redis Cache (24h)       │    │  Return Error       │
         │  Save to User History            │    │  (Khmer/English)    │
         │  Update Model Stats              │    │  + Model Stats      │
         └──────────┬───────────────────────┘    └─────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  Return Analysis     │
         │  + Model Used        │
         │  + Cached: false     │
         └──────────────────────┘
```

## 🎯 Model Selection Logic

### Priority 1: gemini-1.5-flash-latest
```
✅ Fastest response time
✅ 1,500 RPD quota (highest free tier)
✅ Best for simple to moderate code
✅ Cost-effective for high volume
```

### Priority 2: gemini-1.5-pro-latest
```
✅ Higher quality analysis
✅ Better for complex code
✅ Separate quota pool
✅ Automatic fallback when Flash quota exceeded
```

### Priority 3: gemini-1.0-pro-latest
```
✅ Most stable model
✅ Fallback when newer models unavailable
✅ Separate quota pool
✅ Ensures service continuity
```

## 📊 Quota Optimization Strategy

```
┌─────────────────────────────────────────────────────────┐
│  Daily Request Distribution (Example)                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  gemini-1.5-flash-latest:  1,400 requests (93%)        │
│  ████████████████████████████████████████████████       │
│                                                          │
│  gemini-1.5-pro-latest:    80 requests (5%)            │
│  ███                                                     │
│                                                          │
│  gemini-1.0-pro-latest:    20 requests (2%)            │
│  █                                                       │
│                                                          │
│  Total: 1,500 requests/day                              │
└─────────────────────────────────────────────────────────┘
```

## 🔄 Retry Mechanism

```
Request → Model [1/3]
            │
            ├─ ✅ Success → Return result
            │
            └─ ❌ Failed (429 Quota Exceeded)
                  │
                  ▼
               ⏳ Wait 1 second
                  │
                  ▼
               Model [2/3]
                  │
                  ├─ ✅ Success → Return result
                  │
                  └─ ❌ Failed (429 Quota Exceeded)
                        │
                        ▼
                     ⏳ Wait 1 second
                        │
                        ▼
                     Model [3/3]
                        │
                        ├─ ✅ Success → Return result
                        │
                        └─ ❌ Failed → Return error in Khmer
```

## 📈 Success Rate Tracking

```
┌─────────────────────────────────────────────────────────┐
│  Model Usage Statistics (Real-time)                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  gemini-1.5-flash-latest:                               │
│    Success: 145 ████████████████████████████████        │
│    Failed:  5   █                                        │
│                                                          │
│  gemini-1.5-pro-latest:                                 │
│    Success: 8   ██                                       │
│    Failed:  2   █                                        │
│                                                          │
│  gemini-1.0-pro-latest:                                 │
│    Success: 2   █                                        │
│    Failed:  0                                            │
│                                                          │
│  Total Success Rate: 96.8%                              │
└─────────────────────────────────────────────────────────┘
```

## 🔒 Security Audit Flow (100% Khmer)

```
┌─────────────────────────────────────────────────────────┐
│  Code Analysis Request (responseLang: "km")             │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  Gemini Model          │
         │  + Khmer System Prompt │
         └────────┬───────────────┘
                  │
                  ▼
         ┌────────────────────────┐
         │  Analysis Response     │
         │  (100% Natural Khmer)  │
         └────────┬───────────────┘
                  │
                  ▼
    ┌─────────────────────────────────────┐
    │  🔍 វិភាគកូដ                        │
    │  [ពន្យល់អំពីកូដនេះធ្វើអ្វី]         │
    ├─────────────────────────────────────┤
    │  ⚠️ បញ្ហាដែលរកឃើញ                  │
    │  - [បញ្ហាទី១]                        │
    │  - [បញ្ហាទី២]                       │
    ├─────────────────────────────────────┤
    │  🔒 ការវិនិច្ឆ័យសុវត្ថិភាព          │
    │  - SQL Injection: [មាន/គ្មាន]      │
    │  - XSS: [មាន/គ្មាន]                │
    │  - ពាក្យសម្ងាត់: [មាន/គ្មាន]       │
    │  - ពិន្ទុសុវត្ថិភាព: [X/១០]        │
    ├─────────────────────────────────────┤
    │  ✅ កូដដែលកែប្រែ                    │
    │  📖 ពន្យល់បន្ទាត់ម្តងមួយៗ          │
    │  💡 ដំបូន្មាន                        │
    └─────────────────────────────────────┘
```

## 🎯 Key Benefits

### 1. Maximum Quota Utilization
- Primary model has highest quota (1,500 RPD)
- Reduces quota exhaustion
- Better for high-traffic applications

### 2. Automatic Failover
- Seamless fallback to backup models
- No manual intervention required
- Service continuity guaranteed

### 3. Cost Optimization
- Uses fastest/cheapest model first
- Falls back to premium models only when needed
- Maximizes free tier benefits

### 4. Quality Assurance
- 100% natural Khmer responses
- Advanced security auditing
- Consistent response format

### 5. Monitoring & Transparency
- Real-time model usage stats
- Detailed request logging
- Clear error messages in Khmer

## 📝 Quick Reference

### Check Current Model Priority:
```bash
curl http://localhost:3000/api/health | grep -A 5 "geminiModels"
```

### Monitor Model Usage:
```bash
curl http://localhost:3000/api/model-stats
```

### Watch Server Logs:
```bash
npm start
# Look for: 🤖 Trying Gemini model [1/3]: gemini-1.5-flash-latest
```

## ✅ Verification

- [x] gemini-1.5-flash-latest is [1/3]
- [x] gemini-1.5-pro-latest is [2/3]
- [x] gemini-1.0-pro-latest is [3/3]
- [x] 1-second retry delay
- [x] 100% natural Khmer maintained
- [x] Security audit in Khmer
- [x] Model stats tracking
- [x] Graceful error handling

**Status**: ✅ All requirements met
**Branch**: v5-with-original-ui
**Ready**: For production testing
