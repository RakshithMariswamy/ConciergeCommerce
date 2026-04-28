/**
 * LLM Proxy Backend — Cloudflare Worker
 * ──────────────────────────────────────
 * Forwards all LLM requests from the browser to providers' backends.
 * Solves CORS issues (especially with Gemini) by handling requests server-side.
 *
 * Deploy this to Cloudflare Workers, Vercel, AWS Lambda, or run locally with Express.
 * 
 * Then update src/services/agentProxy.js to POST to this endpoint instead of calling SDKs.
 *
 * Usage:
 *   npm install wrangler -g
 *   wrangler deploy
 */

// ─── Cloudflare Worker (copy-paste into wrangler.toml + handler) ────────────

export async function handleLLMRequest(request, env) {
  if (request.method !== 'POST') {
    return new Response('POST only', { status: 405 });
  }

  const body = await request.json();
  const { provider, model, messages, system, tools, maxTokens, temperature } = body;

  if (!provider || !model) {
    return new Response('Missing provider or model', { status: 400 });
  }

  try {
    if (provider === 'gemini') {
      return await callGemini({ model, messages, system, tools, maxTokens, temperature }, env);
    }
    if (provider === 'openai') {
      return await callOpenAI({ model, messages, system, tools, maxTokens, temperature }, env);
    }
    if (provider === 'anthropic') {
      return await callAnthropic({ model, messages, system, tools, maxTokens, temperature }, env);
    }

    return new Response('Unknown provider', { status: 400 });
  } catch (err) {
    console.error(`LLM error (${provider}):`, err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function callGemini(params, env) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        max_tokens: params.maxTokens,
        temperature: params.temperature,
        ...(params.tools ? { tools: params.tools, tool_choice: 'auto' } : {}),
      }),
    }
  );

  const result = await response.json();
  return new Response(JSON.stringify(result), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function callOpenAI(params, env) {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');

  const systemMsg = Array.isArray(params.system)
    ? params.system.filter(b => b?.type === 'text').map(b => b.text).join('\n')
    : params.system;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        ...(systemMsg ? [{ role: 'system', content: systemMsg }] : []),
        ...params.messages,
      ],
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      ...(params.tools ? { tools: params.tools, tool_choice: 'auto' } : {}),
    }),
  });

  const result = await response.json();
  return new Response(JSON.stringify(result), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function callAnthropic(params, env) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      system: params.system,
      messages: params.messages,
      ...(params.tools ? { tools: params.tools } : {}),
    }),
  });

  const result = await response.json();
  return new Response(JSON.stringify(result), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── Alternative: Express.js (run locally on localhost:3001) ────────────────

/**
 * npm install express cors
 * 
 * // server.js
 * import express from 'express';
 * import cors from 'cors';
 * import { handleLLMRequest } from './llm-proxy.js';
 *
 * const app = express();
 * app.use(cors());
 * app.use(express.json());
 *
 * app.post('/api/llm', (req, res) => {
 *   const env = {
 *     GEMINI_API_KEY: process.env.GEMINI_API_KEY,
 *     OPENAI_API_KEY: process.env.OPENAI_API_KEY,
 *     ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
 *   };
 *   return handleLLMRequest(new Request('http://localhost', {
 *     method: 'POST',
 *     body: JSON.stringify(req.body),
 *   }), env).then(r => res.status(r.status).json(r.json()));
 * });
 *
 * app.listen(3001, () => console.log('LLM proxy on :3001'));
 */
