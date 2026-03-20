#!/bin/bash

echo "🚀 Monitoring Deployment to Production"
echo "========================================"
echo ""
echo "Checking: https://konkmeng.onrender.com"
echo ""

for i in {1..10}; do
    echo "Check #$i at $(date +%H:%M:%S)"
    
    VERSION=$(curl -s https://konkmeng.onrender.com/api/health | python3 -c "import sys, json; print(json.load(sys.stdin).get('version', 'N/A'))" 2>/dev/null)
    
    echo "Current version: $VERSION"
    
    if [[ $VERSION == *"5.0"* ]]; then
        echo ""
        echo "✅ SUCCESS! Version 5.0 is deployed!"
        echo ""
        echo "Full response:"
        curl -s https://konkmeng.onrender.com/api/health | python3 -m json.tool
        echo ""
        echo "🎉 Deployment complete!"
        exit 0
    fi
    
    if [ $i -lt 10 ]; then
        echo "⏳ Still deploying... waiting 30 seconds"
        echo ""
        sleep 30
    fi
done

echo ""
echo "⚠️  Deployment taking longer than expected"
echo "Check Render dashboard: https://dashboard.render.com/"
echo ""
echo "Current status:"
curl -s https://konkmeng.onrender.com/api/health | python3 -m json.tool
