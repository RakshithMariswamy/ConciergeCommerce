import { callAgentJson, isAgentEnabled } from '../services/agentProxy';

const ROUTABLE_AGENTS = [
  'task_assignment',
  'customer_intelligence',
  'cart_builder',
  'audit_analysis',
];

const normalizeIntent = (intent) => String(intent || '').toLowerCase();

const safeSerializeContext = (context) => {
  try {
    return JSON.stringify(context || {});
  } catch (_err) {
    return '{"error":"context_not_serializable"}';
  }
};

const isValidRoute = (result) =>
  Boolean(result) &&
  typeof result === 'object' &&
  typeof result.agent === 'string' &&
  typeof result.reason === 'string' &&
  ROUTABLE_AGENTS.includes(result.agent);

const localRoute = (intent = '') => {
  const q = normalizeIntent(intent);

  if (/(assign|reassign|queue|workload|task)/.test(q)) {
    return { agent: 'task_assignment', reason: 'Intent targets assignment optimization.' };
  }

  if (/(customer|client|profile|brief|recommend)/.test(q)) {
    return { agent: 'customer_intelligence', reason: 'Intent requires customer context synthesis.' };
  }

  if (/(cart|basket|outfit|wardrobe|bundle|add to cart)/.test(q)) {
    return { agent: 'cart_builder', reason: 'Intent is focused on cart composition.' };
  }

  if (/(live|session|video|stylist)/.test(q)) {
    return {
      agent: 'cart_builder',
      reason: 'Live shopping specialist is unavailable; routing to cart builder for styling support.',
    };
  }

  return { agent: 'audit_analysis', reason: 'Defaulting to insights and audit reasoning.' };
};

export async function orchestrate({ intent, context }) {
  if (!isAgentEnabled()) {
    return localRoute(intent);
  }

  try {
    const routed = await callAgentJson({
      maxTokens: 256,
      system: `You are a routing orchestrator for a luxury retail concierge platform.\nGiven an intent, return JSON only: {"agent":"<agent_name>","reason":"<one line>"}.\nAllowed agent values: ${ROUTABLE_AGENTS.join(' | ')}.`,
      messages: [
        {
          role: 'user',
          content: `Intent: ${String(intent || '')}\nContext: ${safeSerializeContext(context)}`,
        },
      ],
    });

    if (!isValidRoute(routed)) {
      return localRoute(intent);
    }

    return routed;
  } catch (_err) {
    return localRoute(intent);
  }
}
