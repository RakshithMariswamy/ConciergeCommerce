#!/usr/bin/env node

/**
 * LLM Proxy Server — Express.js
 * ──────────────────────────────
 * Simple backend server that proxies LLM requests to avoid CORS issues.
 *
 * Installation:
 *   npm install express cors dotenv
 *   cp .env.example .env
 *   # Edit .env with your API keys
 *
 * Usage:
 *   node llm-proxy-server.js
 *   # Runs on http://localhost:3001
 *
 * Frontend setup:
 *   Set VITE_LLM_PROXY_URL=http://localhost:3001/api/llm in your .env
 *   All LLM requests will now route through this server
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

function normalizeUpstreamError(payload) {
  const source = Array.isArray(payload) ? payload[0] : payload;
  const err = source?.error ?? source;

  if (typeof err === 'string') {
    return { message: err };
  }

  return {
    code: err?.code,
    status: err?.status,
    message: err?.message || 'Upstream provider error',
    details: err?.details,
  };
}

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── LLM proxy endpoint ────────────────────────────────────────────────────────

app.post('/api/llm', async (req, res) => {
  const { provider, model, messages, system, tools, maxTokens, temperature } = req.body;

  if (!provider || !model) {
    return res.status(400).json({ error: 'Missing provider or model' });
  }

  try {
    if (provider === 'gemini') {
      return await handleGemini({ model, messages, system, tools, maxTokens, temperature }, res);
    }
    if (provider === 'openai') {
      return await handleOpenAI({ model, messages, system, tools, maxTokens, temperature }, res);
    }
    if (provider === 'anthropic') {
      return await handleAnthropic({ model, messages, system, tools, maxTokens, temperature }, res);
    }

    res.status(400).json({ error: `Unknown provider: ${provider}` });
  } catch (err) {
    console.error(`[${provider}]`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Provider handlers ─────────────────────────────────────────────────────────

// Convert Anthropic-format tools → OpenAI-format tools (used by Gemini's OpenAI-compat endpoint)
function toOpenAITools(tools) {
  if (!tools?.length) return undefined;
  return tools.map(t => {
    if (t.type === 'function') return t; // already OpenAI format
    return {
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema ?? t.parameters ?? { type: 'object', properties: {} },
      },
    };
  });
}

// Convert Anthropic-format messages → OpenAI-format messages.
// Anthropic uses content arrays with typed blocks; OpenAI uses tool_calls / role:"tool".
function toOpenAIMessages(messages) {
  const out = [];
  for (const msg of messages) {
    // Plain string content — pass through
    if (!Array.isArray(msg.content)) {
      out.push(msg);
      continue;
    }

    if (msg.role === 'assistant') {
      const textBlocks = msg.content.filter(b => b.type === 'text');
      const toolUseBlocks = msg.content.filter(b => b.type === 'tool_use');
      if (toolUseBlocks.length) {
        out.push({
          role: 'assistant',
          content: textBlocks.map(b => b.text).join('\n') || null,
          tool_calls: toolUseBlocks.map(t => ({
            id: t.id,
            type: 'function',
            function: {
              name: t.name,
              arguments: typeof t.input === 'string' ? t.input : JSON.stringify(t.input ?? {}),
            },
          })),
        });
      } else {
        out.push({ role: 'assistant', content: textBlocks.map(b => b.text).join('\n') });
      }
    } else if (msg.role === 'user') {
      const toolResultBlocks = msg.content.filter(b => b.type === 'tool_result');
      const otherBlocks = msg.content.filter(b => b.type !== 'tool_result');

      // Tool results become role:"tool" messages (one per result)
      for (const t of toolResultBlocks) {
        const content = Array.isArray(t.content)
          ? t.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
          : typeof t.content === 'string' ? t.content : JSON.stringify(t.content ?? '');
        out.push({ role: 'tool', tool_call_id: t.tool_use_id, content });
      }

      // Remaining user text (if any) goes as a normal user message
      const text = otherBlocks.filter(b => b.type === 'text').map(b => b.text).join('\n');
      if (text) out.push({ role: 'user', content: text });
    } else {
      out.push(msg);
    }
  }
  return out;
}

// Preferred model order — flash models first (faster/cheaper), then pro
const GEMINI_MODEL_PREFERENCE = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-preview',
  'gemini-2.0-flash',
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-2.5-pro',
  'gemini-1.5-pro',
];

let geminiModelCache = null; // { models: string[], fetchedAt: number }
const MODEL_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getAvailableGeminiModels(apiKey) {
  const now = Date.now();
  if (geminiModelCache && now - geminiModelCache.fetchedAt < MODEL_CACHE_TTL_MS) {
    return geminiModelCache.models;
  }

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`
    );
    if (!resp.ok) throw new Error(`ListModels failed: ${resp.status}`);
    const data = await resp.json();

    const available = (data.models ?? [])
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => m.name.replace(/^models\//, ''));

    // Sort by preference order; unknown models go to the end
    const sorted = [
      ...GEMINI_MODEL_PREFERENCE.filter(p => available.includes(p)),
      ...available.filter(m => !GEMINI_MODEL_PREFERENCE.includes(m) && m.includes('flash')),
    ];

    geminiModelCache = { models: sorted.length ? sorted : GEMINI_MODEL_PREFERENCE, fetchedAt: now };
    console.log('[gemini] discovered models:', geminiModelCache.models);
  } catch (err) {
    console.warn('[gemini] model discovery failed, using defaults:', err.message);
    geminiModelCache = { models: GEMINI_MODEL_PREFERENCE, fetchedAt: now };
  }

  return geminiModelCache.models;
}

async function callGemini(apiKey, model, body) {
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...body, model }),
    }
  );
  const result = await response.json();
  return { response, result };
}

async function handleGemini(params, res) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing GEMINI_API_KEY environment variable' });
  }

  const systemText = Array.isArray(params.system)
    ? params.system.filter(b => b?.type === 'text').map(b => b.text).join('\n')
    : params.system;

  const body = {
    messages: [
      ...(systemText ? [{ role: 'system', content: systemText }] : []),
      ...toOpenAIMessages(params.messages),
    ],
    max_tokens: params.maxTokens,
    temperature: params.temperature,
    ...(params.tools ? { tools: toOpenAITools(params.tools), tool_choice: 'auto' } : {}),
  };

  const availableModels = await getAvailableGeminiModels(apiKey);
  const startModel = params.model || availableModels[0];
  const chain = [startModel, ...availableModels.filter(m => m !== startModel)];

  let lastResult, lastResponse;
  for (const model of chain) {
    ({ response: lastResponse, result: lastResult } = await callGemini(apiKey, model, body));

    if (lastResponse.ok) {
      if (model !== startModel) {
        console.warn(`[gemini] fell back to ${model} (${startModel} returned ${lastResponse.status})`);
        // Bust cache so next request re-discovers; the preferred model may have recovered
        geminiModelCache = null;
      }
      return res.status(200).json(lastResult);
    }

    // 429 = rate-limited, 404 = model unavailable — both are skippable
    if (lastResponse.status !== 429 && lastResponse.status !== 404) break;
    console.warn(`[gemini] ${model} returned ${lastResponse.status}, trying next…`);
  }

  const providerError = normalizeUpstreamError(lastResult);
  return res.status(lastResponse.status).json({
    error: providerError.message,
    provider_error: providerError,
    retryable: lastResponse.status === 429 || lastResponse.status >= 500,
  });
}

async function handleOpenAI(params, res) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing OPENAI_API_KEY environment variable' });
  }

  const systemText = Array.isArray(params.system)
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
        ...(systemText ? [{ role: 'system', content: systemText }] : []),
        ...toOpenAIMessages(params.messages),
      ],
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      ...(params.tools ? { tools: toOpenAITools(params.tools), tool_choice: 'auto' } : {}),
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    const providerError = normalizeUpstreamError(result);
    return res.status(response.status).json({
      error: providerError.message,
      provider_error: providerError,
      retryable: response.status === 429 || response.status >= 500,
    });
  }
  return res.status(response.status).json(result);
}

async function handleAnthropic(params, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing ANTHROPIC_API_KEY environment variable' });
  }

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
  if (!response.ok) {
    const providerError = normalizeUpstreamError(result);
    return res.status(response.status).json({
      error: providerError.message,
      provider_error: providerError,
      retryable: response.status === 429 || response.status >= 500,
    });
  }
  return res.status(response.status).json(result);
}

// ─── Start server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     LLM Proxy Server started on http://localhost:${PORT}     ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  Set in frontend .env:                                    ║
║    VITE_LLM_PROXY_URL=http://localhost:${PORT}/api/llm        ║
║                                                            ║
║  Backend .env requires:                                   ║
║    GEMINI_API_KEY=...         (for Gemini support)        ║
║    OPENAI_API_KEY=...         (for OpenAI support)        ║
║    ANTHROPIC_API_KEY=...      (for Anthropic support)     ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});
