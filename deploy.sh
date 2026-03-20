#!/bin/bash

# 🚀 Quick Deploy Script for Version 5.0

echo "🚀 ===== KONKMENG v5.0 Deployment ====="
echo ""

# Check if we're in a git repository
if [ ! -d .git ]; then
    echo "❌ Error: Not a git repository"
    echo "Run: git init"
    exit 1
fi

# Check git status
echo "📊 Checking git status..."
git status --short
echo ""

# Ask for confirmation
read -p "🤔 Deploy these changes to production? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Add all changes
echo "📦 Adding changes..."
git add .

# Commit
echo "💾 Committing changes..."
git commit -m "feat: Deploy v5.0 - Redis caching + Advanced security audit

Features:
- Redis edge caching with 24-hour TTL
- SHA-256 hash-based cache keys
- Advanced security audit in 100% natural Khmer
- SQL Injection, XSS, and secrets detection
- Graceful degradation for Redis
- Version 5.0 with enhanced features

Changes:
- Updated server.js with Redis integration
- Added security audit to system prompts
- Implemented cache check before API calls
- Added 24-hour TTL for cached results
- Enhanced error handling and logging"

# Push to production
echo "🚀 Pushing to production..."
git push origin main || git push origin master

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "⏳ Waiting for Render to deploy (this takes ~3 minutes)..."
echo ""
echo "📊 Monitor deployment:"
echo "   Dashboard: https://dashboard.render.com/"
echo "   Logs: Check your service logs"
echo ""
echo "🧪 Test after deployment:"
echo "   curl https://konkmeng.onrender.com/api/health"
echo ""
echo "Expected version: 5.0 (with Gemini AI + Redis Cache + Security Audit)"
echo ""
echo "🎉 Deployment complete! Wait 3 minutes then test."
