#!/bin/bash
# Backend Setup Script for Concierge Commerce LLM Proxy
# This script sets up the backend proxy server for Gemini, OpenAI, and Anthropic

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Concierge Commerce — LLM Proxy Backend Setup           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js detected: $(node --version)"
echo ""

# Navigate to backend directory
cd backend

# Install dependencies
echo "📦 Installing backend dependencies..."
npm install

echo ""
echo "✅ Backend setup complete!"
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Next Steps                              ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║                                                            ║"
echo "║  1. Configure your API keys:                              ║"
echo "║     cp .env.example .env                                  ║"
echo "║     # Edit .env and add your API keys                     ║"
echo "║                                                            ║"
echo "║  2. Start the backend server:                             ║"
echo "║     npm start                                             ║"
echo "║     # Should see: LLM Proxy Server started...             ║"
echo "║                                                            ║"
echo "║  3. Configure frontend .env:                              ║"
echo "║     VITE_LLM_PROXY_URL=http://localhost:3001/api/llm      ║"
echo "║     VITE_LLM_PROVIDER=gemini                              ║"
echo "║                                                            ║"
echo "║  4. Start the frontend (in another terminal):             ║"
echo "║     npm run dev                                           ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
