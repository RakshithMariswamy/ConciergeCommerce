/**
 * Backend Proxy Adapter
 * ────────────────────
 * Routes all LLM requests through a backend endpoint to solve CORS issues.
 * Particularly needed for Gemini which blocks browser requests.
 *
 * The backend should:
 * 1. Accept POST requests with { provider, model, messages, system, tools, ... }
 * 2. Call the actual LLM API server-side
 * 3. Return the normalized response in OpenAI format (which we convert to canonical)
 *
 * Set VITE_LLM_PROXY_URL to enable this adapter.
 * Example: http://localhost:3001/api/llm
 */

import { toCanonical } from './openaiAdapter';

const getProxyURL = () => import.meta.env.VITE_LLM_PROXY_URL;

/**
 * @param {object} params
 * @param {string} params.provider   anthropic | openai | gemini
 * @param {string} params.model
 * @param {string|Array} params.system
 * @param {Array} params.messages    Canonical format
 * @param {Array} [params.tools]     Canonical tool definitions
 * @param {number} params.maxTokens
 * @param {number} params.temperature
 */
export async function call({ provider, model, system, messages, tools, maxTokens, temperature }) {
  const proxyURL = getProxyURL();
  if (!proxyURL) {
    throw new Error(
      `Backend proxy URL not set. Set VITE_LLM_PROXY_URL to use Gemini or other providers that require a backend proxy.`
    );
  }

  const response = await fetch(proxyURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      model,
      system,
      messages,
      tools,
      maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      typeof errorData?.error === 'string'
        ? errorData.error
        : errorData?.error?.message ||
          errorData?.provider_error?.message ||
          response.statusText;
    const err = new Error(`Proxy error (${response.status}): ${errorMessage}`);
    err.status = response.status;
    err.retryable = errorData?.retryable ?? (response.status === 429 || response.status >= 500);
    throw err;
  }

  const result = await response.json();

  // Normalize the response (backend returns OpenAI format for consistency)
  // Anthropic responses are passed through; OpenAI/Gemini are converted to canonical
  if (provider === 'anthropic') {
    // Anthropic response from backend is already in canonical format
    return {
      content: result.content,
      stop_reason: result.stop_reason,
      _provider: provider,
      _raw: result,
    };
  } else {
    // OpenAI/Gemini responses are in OpenAI format, convert to canonical
    return toCanonical(result, provider);
  }
}

/**
 * Checks if the proxy is configured and accessible.
 * Useful for feature detection (e.g., disabling Gemini if no proxy).
 */
export function isProxyAvailable() {
  return Boolean(getProxyURL());
}
