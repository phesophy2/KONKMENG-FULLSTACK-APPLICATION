#!/bin/bash

echo "🧪 KONKMENG AI v5.1 | Groq Edition - API Test Script"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Server URL
SERVER_URL="http://localhost:3000"

echo "📋 Test 1: Health Check"
echo "----------------------"
curl -s "${SERVER_URL}/api/health" | jq '.' || echo -e "${RED}❌ Health check failed${NC}"
echo ""
echo ""

echo "📋 Test 2: Groq Model Stats"
echo "----------------------"
curl -s "${SERVER_URL}/api/model-stats" | jq '.' || echo -e "${RED}❌ Stats check failed${NC}"
echo ""
echo ""

echo "📋 Test 3: Code Analysis (English)"
echo "----------------------"
curl -s -X POST "${SERVER_URL}/api/analyze-code" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function hello() { console.log(\"Hello World\"); }",
    "language": "javascript",
    "responseLang": "en"
  }' | jq '.' || echo -e "${RED}❌ English analysis failed${NC}"
echo ""
echo ""

echo "📋 Test 4: Code Analysis (Khmer)"
echo "----------------------"
curl -s -X POST "${SERVER_URL}/api/analyze-code" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "def greet(name):\n    print(f\"Hello {name}\")",
    "language": "python",
    "responseLang": "km"
  }' | jq '.' || echo -e "${RED}❌ Khmer analysis failed${NC}"
echo ""
echo ""

echo "📋 Test 5: Redis Cache Test (Same code as Test 3)"
echo "----------------------"
echo "This should return cached result..."
curl -s -X POST "${SERVER_URL}/api/analyze-code" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function hello() { console.log(\"Hello World\"); }",
    "language": "javascript",
    "responseLang": "en"
  }' | jq '.cached' || echo -e "${RED}❌ Cache test failed${NC}"
echo ""
echo ""

echo "✅ All tests completed!"
echo ""
echo "💡 Tips:"
echo "  - Make sure server is running: npm start"
echo "  - Make sure GROQ_API_KEY is set in .env"
echo "  - Make sure Redis is running (optional)"
echo "  - Install jq for pretty JSON: brew install jq"
