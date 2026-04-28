/**
 * Anthropic Adapter
 * ─────────────────
 * Wraps @anthropic-ai/sdk and returns responses in the canonical normalized format
 * used internally by all agents:
 *
 *   { content: [{type, text?, id?, name?, input?}], stop_reason, _provider, _raw }
 *
 * Anthropic is the canonical format — no message conversion needed.
 * cache_control blocks in system prompts are kept (Anthropic supports them natively).
 */

import Anthropic from '@anthropic-ai/sdk';

const buildClient = (apiKey) =>
  new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

/**
 * Normalizes system to an array of text blocks if it's a plain string.
 * If already an array (possibly with cache_control), passes through unchanged.
 */
const normalizeSystem = (system) => {
  if (Array.isArray(system)) return system;
  if (typeof system === 'string' && system) return system; // Anthropic also accepts plain string
  return undefined;
};

/**
 * @param {object} params
 * @param {string} params.apiKey
 * @param {string} params.model
 * @param {string|Array} params.system
 * @param {Array} params.messages  - canonical (Anthropic) format
 * @param {Array} [params.tools]   - canonical tool definitions with input_schema
 * @param {number} params.maxTokens
 * @param {number} params.temperature
 * @returns {Promise<{content: Array, stop_reason: string, _provider: string, _raw: object}>}
 */
export async function call({ apiKey, model, system, messages, tools, maxTokens, temperature }) {
  const client = buildClient(apiKey);

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system: normalizeSystem(system),
    messages,
    ...(tools?.length ? { tools } : {}),
  });

  // Already in canonical format
  return {
    content: response.content,
    stop_reason: response.stop_reason,
    _provider: 'anthropic',
    _raw: response,
  };
}
