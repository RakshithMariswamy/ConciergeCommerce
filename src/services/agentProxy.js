/**
 * agentProxy — Multi-LLM provider router
 * ───────────────────────────────────────
 * Reads VITE_LLM_PROVIDER to choose which LLM backend to use.
 * All agents call callAgentRaw / callAgentJson and get back a canonical
 * normalized response regardless of the underlying provider.
 *
 * Supported providers:
 *   anthropic  (default) — claude-sonnet-4-6
 *   openai               — gpt-4o
 *   gemini               — gemini-2.0-flash  (uses OpenAI-compatible endpoint)
 *
 * Env vars:
 *   VITE_LLM_PROVIDER          anthropic | openai | gemini  (default: anthropic)
 *   VITE_LLM_MODEL             Override the default model for the active provider
 *   VITE_ANTHROPIC_API_KEY     Required when VITE_LLM_PROVIDER=anthropic
 *   VITE_OPENAI_API_KEY        Required when VITE_LLM_PROVIDER=openai
 *   VITE_GEMINI_API_KEY        Required when VITE_LLM_PROVIDER=gemini
 *   VITE_ENABLE_AGENTS         Set to 'false' to force local fallback mode
 */

import { call as anthropicCall } from './llmAdapters/anthropicAdapter';
import { call as openaiCall }    from './llmAdapters/openaiAdapter';
import { call as geminiCall }    from './llmAdapters/geminiAdapter';
import { call as proxyCall, isProxyAvailable } from './llmAdapters/proxyAdapter';

// ─── Provider config ──────────────────────────────────────────────────────────

const PROVIDER_DEFAULTS = {
  anthropic: 'claude-sonnet-4-6',
  openai:    'gpt-4o',
  gemini:    'gemini-2.0-flash',
};

const PROVIDER_ADAPTERS = {
  anthropic: anthropicCall,
  openai:    openaiCall,
  gemini:    geminiCall,
};

export const getProvider = () =>
  (import.meta.env.VITE_LLM_PROVIDER || 'anthropic').toLowerCase();

const getDefaultModel = () => {
  const custom = import.meta.env.VITE_LLM_MODEL;
  if (custom) return custom;
  const provider = getProvider();
  // Legacy: if no VITE_LLM_MODEL but VITE_ANTHROPIC_MODEL is set, honour it for backwards-compat
  if (provider === 'anthropic') {
    return import.meta.env.VITE_ANTHROPIC_MODEL || PROVIDER_DEFAULTS.anthropic;
  }
  return PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.anthropic;
};

const getApiKey = () => {
  const provider = getProvider();
  if (provider === 'openai') return import.meta.env.VITE_OPENAI_API_KEY;
  if (provider === 'gemini') return import.meta.env.VITE_GEMINI_API_KEY;
  return import.meta.env.VITE_ANTHROPIC_API_KEY;
};

// ─── Feature gate ─────────────────────────────────────────────────────────────

export const isAgentEnabled = () => {
  const featureFlag = import.meta.env.VITE_ENABLE_AGENTS;
  const devOnly = import.meta.env.DEV;
  return devOnly && featureFlag !== 'false' && Boolean(getApiKey());
};

// ─── Retry helper ─────────────────────────────────────────────────────────────

const MAX_RETRIES = 2;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRateLimit = (err) =>
  err?.status === 429 || /429|rate.?limit|resource.?exhaust/i.test(err?.message ?? '');

const withRetry = async (fn, retries = MAX_RETRIES) => {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      if (err?.retryable === false) break;
      // Rate-limit: 2s → 4s exponential; everything else: 250ms → 500ms
      const delay = isRateLimit(err) ? 2000 * 2 ** attempt : 250 * (attempt + 1);
      await sleep(delay);
    }
  }
  throw lastErr;
};

// ─── Shared helpers (used by agents) ─────────────────────────────────────────

/** Extracts all text blocks from a canonical content array into a single string. */
export const extractTextFromContent = (content = []) =>
  content
    .filter((block) => block?.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n')
    .trim();

/** Safely parses a JSON string, falling back to brace-extraction heuristic. */
export const safeJsonParse = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch {
      return null;
    }
  }
};

// ─── Core call API ────────────────────────────────────────────────────────────

/**
 * Dispatches to the active LLM provider and returns a normalized canonical response:
 * { content: [{type, text?, id?, name?, input?}], stop_reason, _provider, _raw }
 *
 * All agents use this. Provider selection is transparent to callers.
 *
 * If VITE_LLM_PROXY_URL is set, routes through backend proxy (recommended for Gemini).
 * Otherwise uses direct adapters (works for Anthropic/OpenAI, fails for Gemini due to CORS).
 */
export async function callAgentRaw({
  system,
  messages,
  tools,
  maxTokens = 1024,
  temperature = 0.2,
  model,
}) {
  const provider = getProvider();
  const resolvedModel = model || getDefaultModel();

  // If proxy is available, always use it (best for production + Gemini support)
  if (isProxyAvailable()) {
    return withRetry(() =>
      proxyCall({ provider, model: resolvedModel, system, messages, tools, maxTokens, temperature })
    );
  }

  // Without proxy, Gemini will fail — provide helpful error
  if (provider === 'gemini') {
    throw new Error(
      `Gemini requires a backend proxy to work from the browser due to CORS restrictions.\n\n` +
      `Set VITE_LLM_PROXY_URL in your .env file to enable Gemini support.\n` +
      `See docs/GEMINI_CORS_SOLUTION.md for setup instructions.\n\n` +
      `For development, you can use Anthropic or OpenAI instead (they allow browser requests):\n` +
      `  VITE_LLM_PROVIDER=anthropic\n` +
      `  VITE_ANTHROPIC_API_KEY=sk-ant-...`
    );
  }

  // Direct adapters for Anthropic and OpenAI (no CORS issues)
  const adapter = PROVIDER_ADAPTERS[provider];

  if (!adapter) {
    throw new Error(
      `Unknown LLM provider: "${provider}". Set VITE_LLM_PROVIDER to anthropic, openai, or gemini.`
    );
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      `Missing API key for provider "${provider}". ` +
        `Set VITE_${provider.toUpperCase()}_API_KEY in your .env file.`
    );
  }

  return withRetry(() =>
    adapter({ apiKey, model: resolvedModel, system, messages, tools, maxTokens, temperature })
  );
}

/**
 * Like callAgentRaw but parses the first text block as JSON.
 * Used by orchestrator, task assignment, customer intel, and audit agents.
 */
export async function callAgentJson({
  system,
  messages,
  tools,
  maxTokens = 1024,
  temperature = 0.2,
  model,
}) {
  const response = await callAgentRaw({ system, messages, tools, maxTokens, temperature, model });
  const text = extractTextFromContent(response.content);
  const parsed = safeJsonParse(text);

  if (!parsed) {
    throw new Error(
      `Agent (${getProvider()}) returned non-JSON output: ${text.slice(0, 200)}`
    );
  }

  return parsed;
}

