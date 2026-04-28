# LLM Proxy Backend

Simple Express.js server that proxies LLM requests to Gemini, OpenAI, and Anthropic.

Solves CORS issues by handling API calls server-side. Particularly needed for **Gemini**, which blocks browser requests.

## Quick Start

### 1. Install dependencies

```bash
npm install express cors dotenv
```

### 2. Set up environment

```bash
cp .env.example .env
# Edit .env with your API keys (at least one required)
```

### 3. Start the server

```bash
node llm-proxy-server.js
```

You should see:

```
╔════════════════════════════════════════════════════════════╗
║     LLM Proxy Server started on http://localhost:3001     ║
║                                                            ║
║  Set in frontend .env:                                    ║
║    VITE_LLM_PROXY_URL=http://localhost:3001/api/llm        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

### 4. Configure frontend

In the **frontend** `.env` file:

```
VITE_LLM_PROXY_URL=http://localhost:3001/api/llm
VITE_LLM_PROVIDER=gemini
VITE_GEMINI_API_KEY=AIza...  # Can be any dummy value, proxy uses backend .env
```

## Production Deployment

### Cloudflare Workers (Recommended)

See `../docs/LLM_PROXY_BACKEND.js` for the Cloudflare Worker implementation.

Deploy with:
```bash
npm install wrangler -g
wrangler deploy
```

Then set in frontend `.env`:
```
VITE_LLM_PROXY_URL=https://your-worker.your-domain.workers.dev/api/llm
```

### Vercel

Deploy this Express server as a Vercel serverless function. Commit to a `/api` folder and Vercel will auto-deploy.

### AWS Lambda / Docker

Deploy the server as a container and set `VITE_LLM_PROXY_URL` to the public endpoint.

## API Endpoint

**POST** `/api/llm`

Request body:
```json
{
  "provider": "gemini|openai|anthropic",
  "model": "gemini-2.0-flash",
  "messages": [...],
  "system": "You are...",
  "tools": [...],
  "maxTokens": 1024,
  "temperature": 0.2
}
```

Response:
```json
{
  "choices": [{"message": {"content": "..."}, "finish_reason": "stop"}],
  "usage": {...}
}
```

(Returns OpenAI format for consistency.)

## Health Check

**GET** `/health`

Returns:
```json
{"status": "ok", "timestamp": "2026-04-28T..."}
```

## Troubleshooting

### "Missing API key" error

Check that `.env` has at least one of:
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

### CORS errors from frontend

Ensure:
1. Backend is running on `http://localhost:3001`
2. Frontend has `VITE_LLM_PROXY_URL=http://localhost:3001/api/llm`
3. Both are running in dev mode

### Frontend can't reach backend

Check:
1. Backend is listening: `curl http://localhost:3001/health`
2. Frontend is on same machine or network
3. No firewall blocking port 3001
