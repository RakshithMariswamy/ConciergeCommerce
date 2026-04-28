/**
 * OpenAI Adapter
 * ──────────────
 * Converts canonical (Anthropic-style) messages ↔ OpenAI chat completion format.
 * Also used as the base for the Gemini adapter (Gemini exposes an OpenAI-compatible API).
 *
 * Canonical format (internal):
 *   messages: [
 *     { role: 'user', content: 'string' }
 *     { role: 'assistant', content: [{type:'text',text},{type:'tool_use',id,name,input}] }
 *     { role: 'user', content: [{type:'tool_result',tool_use_id,content}] }
 *   ]
 *   tools: [{ name, description, input_schema }]
 *   stop_reason: 'end_turn' | 'tool_use'
 *
 * OpenAI format (provider):
 *   messages: [
 *     { role: 'system', content: '...' }
 *     { role: 'user', content: '...' }
 *     { role: 'assistant', content: null, tool_calls: [{id,type:'function',function:{name,arguments}}] }
 *     { role: 'tool', tool_call_id: '...', content: '...' }
 *   ]
 *   tools: [{ type:'function', function:{name,description,parameters} }]
 *   finish_reason: 'stop' | 'tool_calls'
 */

import OpenAI from 'openai';

export const buildClient = (apiKey, baseURL) =>
  new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}), dangerouslyAllowBrowser: true });

// ─── System prompt ────────────────────────────────────────────────────────────
// Strips cache_control and array wrapping — OpenAI only accepts a plain string.
const extractSystemText = (system) => {
  if (typeof system === 'string') return system;
  if (Array.isArray(system)) {
    return system
      .filter((b) => b?.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('\n');
  }
  return '';
};

// ─── Tool definitions ─────────────────────────────────────────────────────────
// Converts input_schema → parameters and wraps in OpenAI function envelope.
const normalizeTools = (tools = []) =>
  tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description || '',
      parameters: t.input_schema || { type: 'object', properties: {} },
    },
  }));

// ─── Message conversion: canonical → OpenAI ──────────────────────────────────
const toOpenAIMessages = (messages = []) => {
  const result = [];

  for (const msg of messages) {
    if (msg.role === 'user') {
      if (typeof msg.content === 'string') {
        result.push({ role: 'user', content: msg.content });
      } else if (Array.isArray(msg.content)) {
        // Tool results come from the agent as user messages with tool_result blocks
        const toolResultBlocks = msg.content.filter((b) => b?.type === 'tool_result');
        const textBlocks = msg.content.filter((b) => b?.type === 'text');

        for (const tr of toolResultBlocks) {
          result.push({
            role: 'tool',
            tool_call_id: tr.tool_use_id,
            content:
              typeof tr.content === 'string' ? tr.content : JSON.stringify(tr.content),
          });
        }

        if (textBlocks.length > 0) {
          result.push({
            role: 'user',
            content: textBlocks.map((b) => b.text).join('\n'),
          });
        }
      }
    } else if (msg.role === 'assistant') {
      if (typeof msg.content === 'string') {
        result.push({ role: 'assistant', content: msg.content });
      } else if (Array.isArray(msg.content)) {
        const textBlocks = msg.content.filter((b) => b?.type === 'text');
        const toolUseBlocks = msg.content.filter((b) => b?.type === 'tool_use');

        if (toolUseBlocks.length > 0) {
          result.push({
            role: 'assistant',
            content: textBlocks.length > 0 ? textBlocks.map((b) => b.text).join('\n') : null,
            tool_calls: toolUseBlocks.map((b) => ({
              id: b.id,
              type: 'function',
              function: {
                name: b.name,
                arguments: JSON.stringify(b.input || {}),
              },
            })),
          });
        } else {
          result.push({
            role: 'assistant',
            content: textBlocks.map((b) => b.text).join('\n'),
          });
        }
      }
    }
  }

  return result;
};

// ─── Response normalization: OpenAI → canonical ───────────────────────────────
export const toCanonical = (response, provider = 'openai') => {
  const choice = response.choices?.[0];
  if (!choice) throw new Error(`${provider} returned no choices`);

  const msg = choice.message;
  const finishReason = choice.finish_reason;

  let content = [];
  let stopReason = 'end_turn';

  if (finishReason === 'tool_calls' && msg.tool_calls?.length > 0) {
    stopReason = 'tool_use';

    // Text prefix (some models include a short preamble before tool calls)
    if (msg.content) {
      content.push({ type: 'text', text: msg.content });
    }

    // Tool use blocks — mimic Anthropic's shape so existing executors work unchanged
    content.push(
      ...msg.tool_calls.map((tc) => ({
        type: 'tool_use',
        id: tc.id,
        name: tc.function.name,
        input: (() => {
          try {
            return JSON.parse(tc.function.arguments);
          } catch {
            return {};
          }
        })(),
      }))
    );
  } else {
    content = [{ type: 'text', text: msg.content || '' }];
  }

  return { content, stop_reason: stopReason, _provider: provider, _raw: response };
};

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * @param {object} params
 * @param {string} params.apiKey
 * @param {string} [params.baseURL]    Override for Gemini or local Ollama
 * @param {string} [params.provider]   Used for _provider tag in response (default 'openai')
 * @param {string} params.model
 * @param {string|Array} params.system
 * @param {Array} params.messages      Canonical format
 * @param {Array} [params.tools]       Canonical tool definitions
 * @param {number} params.maxTokens
 * @param {number} params.temperature
 */
export async function call({
  apiKey,
  baseURL,
  provider = 'openai',
  model,
  system,
  messages,
  tools,
  maxTokens,
  temperature,
}) {
  const client = buildClient(apiKey, baseURL);
  const systemText = extractSystemText(system);

  const openaiMessages = [
    ...(systemText ? [{ role: 'system', content: systemText }] : []),
    ...toOpenAIMessages(messages),
  ];

  const openaiTools = tools?.length ? normalizeTools(tools) : undefined;

  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    temperature,
    messages: openaiMessages,
    ...(openaiTools ? { tools: openaiTools, tool_choice: 'auto' } : {}),
  });

  return toCanonical(response, provider);
}
