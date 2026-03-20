#!/bin/bash

echo "🚀 ===== KONKMENG AI v5.1 | Groq Edition ====="
echo "📦 Deployment to Render"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Pre-Deployment Checklist:${NC}"
echo ""

# Check if on correct branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "v5-with-original-ui" ]; then
    echo -e "${RED}❌ Wrong branch! Current: $CURRENT_BRANCH${NC}"
    echo -e "${YELLOW}   Switch to v5-with-original-ui branch${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Branch: $CURRENT_BRANCH${NC}"
fi

# Check if changes are committed
if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}❌ Uncommitted changes detected${NC}"
    echo -e "${YELLOW}   Commit your changes first${NC}"
    exit 1
else
    echo -e "${GREEN}✅ All changes committed${NC}"
fi

# Check if pushed to remote
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u} 2>/dev/null)
if [ "$LOCAL" != "$REMOTE" ]; then
    echo -e "${YELLOW}⚠️  Local commits not pushed to remote${NC}"
    echo -e "${YELLOW}   Pushing to GitHub...${NC}"
    git push origin v5-with-original-ui
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Pushed to GitHub${NC}"
    else
        echo -e "${RED}❌ Push failed${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Synced with remote${NC}"
fi

echo ""
echo -e "${BLUE}🔧 Render Configuration Required:${NC}"
echo ""
echo "1. Go to: https://dashboard.render.com"
echo "2. Select your KONKMENG service"
echo "3. Go to 'Environment' tab"
echo "4. Add/Update these variables:"
echo ""
echo -e "${YELLOW}   GROQ_API_KEY=gsk_YOUR_ACTUAL_GROQ_API_KEY_HERE${NC}"
echo ""
echo "5. Remove old variables (if exist):"
echo -e "${RED}   GEMINI_API_KEY (delete this)${NC}"
echo ""
echo "6. Go to 'Settings' tab"
echo "7. Under 'Build & Deploy':"
echo "   - Branch: v5-with-original-ui"
echo "   - Auto-Deploy: Yes"
echo "8. Click 'Save Changes'"
echo ""
echo -e "${GREEN}✅ Render will automatically deploy!${NC}"
echo ""

echo -e "${BLUE}📊 Monitor Deployment:${NC}"
echo ""
echo "Watch logs in Render Dashboard for:"
echo "  🔍 KONKMENG AI SYSTEM v5.1 | Groq Edition"
echo "  🔑 GROQ_API_KEY exists: true"
echo "  🤖 AI_ENGINE: Groq (Llama 3.3 70B Versatile)"
echo "  ✅ MongoDB connected successfully"
echo ""

echo -e "${BLUE}🧪 Test After Deployment:${NC}"
echo ""
echo "1. Health Check:"
echo "   curl https://konkmeng.onrender.com/api/health"
echo ""
echo "2. Code Analysis (Khmer):"
echo "   curl -X POST https://konkmeng.onrender.com/api/analyze-code \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"code\":\"function test(){}\",\"language\":\"javascript\",\"responseLang\":\"km\"}'"
echo ""
echo "3. Check Stats:"
echo "   curl https://konkmeng.onrender.com/api/model-stats"
echo ""

echo -e "${GREEN}🎉 Deployment preparation complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Configure Render environment variables (see above)"
echo "2. Wait for auto-deploy to complete (~2-3 minutes)"
echo "3. Test the endpoints"
echo "4. Monitor for 24 hours"
echo ""
echo "📖 Full guide: See 🚀_PRODUCTION_DEPLOYMENT.md"
