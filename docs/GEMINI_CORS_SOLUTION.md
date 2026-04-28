# Gemini CORS Issue & Backend Proxy Solution

## Problem

When using **Gemini** as the LLM provider from the browser, you get a **403 CORS error**:

```
Access to XMLHttpRequest at 'https://generativelanguage.googleapis.com/...' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```

### Why?

Google's Gemini API endpoint does **not** allow direct browser requests for security reasons. The `dangerouslyAllowBrowser: true` flag in the SDK is just a warning — it doesn't bypass CORS.

**Anthropic and OpenAI** allow browser requests, so they work without a backend.

---

## Solution: Backend Proxy (All Providers)

The fix is to proxy **all** LLM requests through a backend server that you control. This:
- ✅ Solves Gemini's CORS issues
- ✅ Adds an extra layer of security (API keys stay server-side)
- ✅ Enables rate limiting and monitoring
- ✅ Works for all providers (Anthropic, OpenAI, Gemini)

### Quick Start (Local Express Server)

#### 1. Start the backend proxy

```bash
cd backend
cp .env.example .env
# Edit .env with your API keys

npm install express cors dotenv
node llm-proxy-server.js
```

You'll see:
```
╔════════════════════════════════════════════════════════════╗
║     LLM Proxy Server started on http://localhost:3001     ║
╚════════════════════════════════════════════════════════════╝
```

#### 2. Configure frontend

In the **frontend** `.env`:

```
VITE_LLM_PROXY_URL=http://localhost:3001/api/llm
VITE_LLM_PROVIDER=gemini
VITE_GEMINI_API_KEY=dummy  # Can be any value, proxy uses backend .env
```

#### 3. Start both servers

```bash
# Terminal 1: Backend (from backend/ folder)
node llm-proxy-server.js

# Terminal 2: Frontend (from root folder)
npm run dev
```

Now all Gemini requests go through the backend proxy and CORS errors disappear! ✅

---

## Production Deployment

### Option 1: Cloudflare Workers (Recommended)

**Pros**: Free tier, auto-scaling, no infrastructure

See `docs/LLM_PROXY_BACKEND.js` for the Cloudflare Worker code.

```bash
npm install wrangler -g
cd backend
wrangler deploy
```

Set in frontend `.env`:
```
VITE_LLM_PROXY_URL=https://your-worker.your-domain.workers.dev/api/llm
```

### Option 2: Vercel / AWS Lambda

Deploy `backend/llm-proxy-server.js` as a serverless function and set the URL.

### Option 3: Docker Container

Build and deploy the backend as a service alongside your frontend.

---

## Provider Setup

### Gemini (Free tier available)

1. Get key: https://aistudio.google.com/apikey
2. Set in backend `.env`:
   ```
   GEMINI_API_KEY=AIza...
   ```

### OpenAI

1. Get key: https://platform.openai.com/api-keys
2. Set in backend `.env`:
   ```
   OPENAI_API_KEY=sk-...
   ```

### Anthropic

1. Get key: https://console.anthropic.com
2. Set in backend `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

---

## For Dev Only: Direct Browser (Gemini Not Supported)

If you just want to test **without** a backend:

Use **Anthropic** or **OpenAI** instead — they allow browser requests:

```
VITE_LLM_PROVIDER=anthropic
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

Or:

```
VITE_LLM_PROVIDER=openai
VITE_OPENAI_API_KEY=sk-...
```

Gemini **requires** a backend proxy due to CORS restrictions.

---

## Troubleshooting

### "Gemini requires a backend proxy"

This error means `VITE_LLM_PROXY_URL` is not set in frontend `.env`.

Fix:
```
VITE_LLM_PROXY_URL=http://localhost:3001/api/llm
```

And make sure the backend is running.

### Backend gives 401 "Missing API key"

Check that backend `.env` has the key for your provider:
```bash
cat backend/.env | grep GEMINI_API_KEY
```

### Frontend can't reach backend

```bash
# Test the connection
curl http://localhost:3001/health

# Should return:
# {"status":"ok","timestamp":"..."}
```

If it fails, check:
1. Backend is running (`node llm-proxy-server.js`)
2. Port 3001 is not blocked by firewall
3. Frontend is on same machine or network
