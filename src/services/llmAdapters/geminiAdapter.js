/**
 * Gemini Adapter
 * ──────────────
 * Google Gemini exposes an OpenAI-compatible REST endpoint, so this adapter
 * is a thin wrapper over openaiAdapter — just sets the correct base URL and
 * tags the response with _provider: 'gemini'.
 *
 * Supported models: gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash, etc.
 * Docs: https://ai.google.dev/gemini-api/docs/openai
 *
 * API key: VITE_GEMINI_API_KEY (get one free at https://aistudio.google.com/apikey)
 */

import { call as openaiCall } from './openaiAdapter';

const GEMINI_OPENAI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';

/**
 * @param {object} params  Same shape as openaiAdapter.call()
 */
export async function call({ apiKey, model, system, messages, tools, maxTokens, temperature }) {
  return openaiCall({
    apiKey,
    baseURL: GEMINI_OPENAI_BASE_URL,
    provider: 'gemini',
    model,
    system,
    messages,
    tools,
    maxTokens,
    temperature,
  });
}
