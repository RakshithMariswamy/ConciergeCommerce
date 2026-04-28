# Complete Setup Guide — Concierge Commerce with Multi-LLM Support

This guide walks you through setting up the Concierge Commerce platform with support for Anthropic, OpenAI, and Gemini LLMs.

---

## Overview

The platform now supports three LLM providers:
- **Anthropic** (Claude) — works directly in browser
- **OpenAI** (GPT-4) — works directly in browser
- **Gemini** (Google) — **requires backend proxy** due to CORS restrictions

For **Gemini support**, you need to run a backend proxy server alongside the frontend.

---

## Quick Start (with Gemini)

### Step 1: Set up the backend proxy

```bash
cd backend
bash setup.sh          # macOS/Linux
# OR
setup.bat             # Windows
```

This installs backend dependencies and shows next steps.

### Step 2: Configure backend API keys

```bash
cd backend
cp .env.example .env
# Edit .env and add your Gemini API key (at minimum):
# GEMINI_API_KEY=AIza...
```

Get a free Gemini API key at: https://aistudio.google.com/apikey

### Step 3: Start the backend

```bash
# From backend/ folder
npm start
```

You should see:
```
╔════════════════════════════════════════════════════════════╗
║     LLM Proxy Server started on http://localhost:3001     ║
╚════════════════════════════════════════════════════════════╝
```

### Step 4: Configure the frontend

In the **root** `.env` file (not backend/.env):

```
VITE_LLM_PROXY_URL=http://localhost:3001/api/llm
VITE_LLM_PROVIDER=gemini
VITE_GEMINI_API_KEY=dummy
```

(The API key can be any value — the backend uses its own .env)

### Step 5: Start the frontend

In a **new terminal** (from the root folder):

```bash
npm run dev
```

Frontend will be at: http://localhost:5173

---

## For Development Only (without Gemini)

If you want to skip the backend setup and just use Anthropic or OpenAI:

### .env (frontend):
```
VITE_LLM_PROVIDER=anthropic
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

### Start frontend only:
```bash
npm run dev
```

No backend needed — works directly in the browser.

---

## Production Deployment

### Option 1: Cloudflare Workers (Recommended for Gemini)

Deploy the backend as a Cloudflare Worker:

```bash
npm install wrangler -g
cd backend
wrangler deploy
```

Then in frontend `.env`:
```
VITE_LLM_PROXY_URL=https://your-worker.workers.dev/api/llm
VITE_LLM_PROVIDER=gemini
```

### Option 2: Vercel / AWS Lambda

Deploy `backend/llm-proxy-server.js` as a serverless function and set the public URL.

### Option 3: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ .
EXPOSE 3001
CMD ["npm", "start"]
```

---

## Troubleshooting

### "Gemini requires a backend proxy" error

This means `VITE_LLM_PROXY_URL` is not set in frontend `.env`.

Fix:
1. Backend is running on port 3001
2. Frontend `.env` has:
   ```
   VITE_LLM_PROXY_URL=http://localhost:3001/api/llm
   ```
3. Restart frontend

### Backend fails to start: "Cannot find module"

Run:
```bash
cd backend
npm install
```

### "Missing GEMINI_API_KEY" error

Check that `backend/.env` has:
```
GEMINI_API_KEY=AIza...
```

### Frontend can't reach backend

Test the connection:
```bash
curl http://localhost:3001/health
```

Should return:
```json
{"status":"ok","timestamp":"..."}
```

If it fails:
1. Is backend running? (`npm start` from backend/)
2. Is port 3001 available?
3. No firewall blocking the port?

---

## File Structure

```
concierge-commerce/
├── src/
│   ├── services/
│   │   ├── agentProxy.js              ← Smart routing (proxy + direct)
│   │   └── llmAdapters/
│   │       ├── anthropicAdapter.js    ← Anthropic SDK
│   │       ├── openaiAdapter.js       ← OpenAI SDK (+ Gemini converter)
│   │       ├── geminiAdapter.js       ← Gemini wrapper
│   │       └── proxyAdapter.js        ← Backend proxy handler
│   └── ...
├── backend/
│   ├── llm-proxy-server.js            ← Express server
│   ├── package.json                   ← Backend deps
│   ├── .env.example                   ← Template
│   ├── setup.sh / setup.bat           ← Easy setup
│   └── README.md                      ← Backend docs
├── docs/
│   ├── GEMINI_CORS_SOLUTION.md        ← Detailed explanation
│   └── LLM_PROXY_BACKEND.js           ← Cloudflare Worker code
├── .env.example                       ← Frontend template
└── package.json
```

---

## How It Works

### Without Backend (Anthropic/OpenAI)

```
Browser
  ↓
Frontend app
  ↓
callAgentRaw (agentProxy.js)
  ↓
Adapter (anthropicAdapter.js / openaiAdapter.js)
  ↓
LLM API
```

### With Backend (Gemini)

```
Browser
  ↓
Frontend app
  ↓
callAgentRaw (agentProxy.js) — detects proxy URL
  ↓
proxyAdapter.js (POST to backend)
  ↓
Backend Proxy Server (llm-proxy-server.js)
  ↓
Gemini API (no CORS issues!)
  ↓
Response back to frontend
```

---

## FAQ

**Q: Do I need the backend to use Anthropic or OpenAI?**

A: No. The backend is **optional** — only required for Gemini. Anthropic and OpenAI work directly in the browser.

**Q: Why does Gemini need a backend?**

A: Google restricts Gemini's API to backend-only requests for security. Browser requests are blocked by CORS.

**Q: Can I use the backend with Anthropic/OpenAI too?**

A: Yes! When `VITE_LLM_PROXY_URL` is set, all providers route through it. Useful if you want to add logging, rate limiting, or keep API keys server-side.

**Q: Is the backend code production-ready?**

A: Yes. It's a minimal Express server designed to be deployed to Cloudflare Workers, Vercel, or Docker. For sensitive deployments, add authentication, rate limiting, and request logging.

---

## Next Steps

- See [docs/GEMINI_CORS_SOLUTION.md](../docs/GEMINI_CORS_SOLUTION.md) for more details
- See [backend/README.md](../backend/README.md) for backend API documentation
- See [MULTI_AGENT_GUIDE.md](../MULTI_AGENT_GUIDE.md) for the multi-agent architecture
