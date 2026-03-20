#!/bin/bash

echo "🧪 ===== TESTING KONKMENG AI v5.1 API FIX ====="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo "📋 Test 1: Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health)
if echo "$HEALTH_RESPONSE" | grep -q "5.1"; then
    echo -e "${GREEN}✅ PASS${NC} - Server is running v5.1 | Hardened Edition"
    echo "$HEALTH_RESPONSE" | jq '.'
else
    echo -e "${RED}❌ FAIL${NC} - Server not responding correctly"
    echo "$HEALTH_RESPONSE"
fi
echo ""

# Test 2: Code Analysis (Simple JavaScript)
echo "📋 Test 2: Code Analysis - JavaScript"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
CODE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function add(a, b) { return a + b; }",
    "language": "JavaScript",
    "responseLang": "km"
  }')

if echo "$CODE_RESPONSE" | grep -q "success"; then
    MODEL_USED=$(echo "$CODE_RESPONSE" | jq -r '.model')
    IS_CACHED=$(echo "$CODE_RESPONSE" | jq -r '.cached')
    
    if [ "$MODEL_USED" = "gemini-2.5-flash" ] || [ "$MODEL_USED" = "gemini-flash-latest" ] || [ "$MODEL_USED" = "gemini-2.5-pro" ]; then
        echo -e "${GREEN}✅ PASS${NC} - Code analysis successful"
        echo "   Model Used: $MODEL_USED"
        echo "   Cached: $IS_CACHED"
    else
        echo -e "${YELLOW}⚠️  WARNING${NC} - Unexpected model: $MODEL_USED"
    fi
else
    echo -e "${RED}❌ FAIL${NC} - Code analysis failed"
    echo "$CODE_RESPONSE" | jq '.'
fi
echo ""

# Test 3: Model Stats
echo "📋 Test 3: Model Statistics"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
STATS_RESPONSE=$(curl -s http://localhost:3000/api/model-stats)
if echo "$STATS_RESPONSE" | grep -q "gemini-2.5-flash"; then
    echo -e "${GREEN}✅ PASS${NC} - Model stats tracking correctly"
    echo "$STATS_RESPONSE" | jq '.current'
else
    echo -e "${RED}❌ FAIL${NC} - Model stats not tracking correctly"
    echo "$STATS_RESPONSE"
fi
echo ""

# Test 4: Cache Test (Second Request)
echo "📋 Test 4: Redis Cache Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
CACHE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/analyze-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function add(a, b) { return a + b; }",
    "language": "JavaScript",
    "responseLang": "km"
  }')

IS_CACHED=$(echo "$CACHE_RESPONSE" | jq -r '.cached')
if [ "$IS_CACHED" = "true" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Redis cache is working (result from cache)"
else
    echo -e "${YELLOW}⚠️  INFO${NC} - Result not from cache (may be first request or cache miss)"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ All critical tests completed"
echo "📊 Check console logs for detailed model usage"
echo "💡 If you see 429 errors, wait for quota reset (daily)"
echo ""
echo "🔗 Useful Endpoints:"
echo "   • Health: http://localhost:3000/api/health"
echo "   • Model Stats: http://localhost:3000/api/model-stats"
echo "   • Code Analysis: POST http://localhost:3000/api/analyze-code"
echo ""
