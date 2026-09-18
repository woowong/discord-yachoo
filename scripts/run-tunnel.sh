#!/bin/bash
set -e

PORT=${1:-8765}

echo "=========================================================="
echo " 🚇 Starting Cloudflare Tunnel for FlyBrain SNN (Port $PORT)"
echo "=========================================================="

if ! command -v cloudflared &> /dev/null; then
    echo "❌ cloudflared is not installed or not in PATH."
    echo "   Install via: brew install cloudflared"
    exit 1
fi

echo "Checking if local FlyBrain server is reachable at http://localhost:$PORT..."
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/api/status" 2>/dev/null | grep -q "200"; then
    echo "✅ Local FlyBrain server is healthy and responding!"
else
    echo "⚠️ Warning: Local server at http://localhost:$PORT did not respond with 200."
    echo "   Ensure it is running via: npm run fly:start"
fi

echo ""
echo "🚀 Launching Cloudflare Tunnel..."
echo "Copy the generated 'https://*.trycloudflare.com' URL and set as FLY_BRAIN_URL."
echo ""

exec cloudflared tunnel --url "http://localhost:$PORT"
