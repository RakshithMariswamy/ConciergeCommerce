# Multi-Agent Adoption Guide — Concierge Commerce

## Overview

This guide details how to adopt a multi-agent AI architecture in the Concierge Commerce platform — a pure frontend React SPA with a task assignment engine, Zustand stores, and clean service layers, but **zero AI/LLM integration today**.

The clean separation of concerns is the biggest advantage: multi-agent intelligence can be grafted onto existing seams without rewriting anything.

---

## What "Multi-Agent" Means Here

A multi-agent system is a set of specialized AI workers, each owning a narrow domain, coordinated by an **Orchestrator** that decides who does what.

```
User Action / System Event
        │
        ▼
  [Orchestrator Agent]  ←── routes based on intent
   /    |     \    \
  ↓     ↓      ↓    ↓
Task  Customer  Cart  Live
Agent  Agent  Agent  Shopping
               Agent
```

Each agent gets a focused prompt, focused tools, and focused context — so it is fast, cheap, and debuggable.

---

## The 5 Agents This App Needs

### Agent 1 — Orchestrator

**File to create:** `src/agents/orchestratorAgent.js`

Routes incoming intents to the right specialist. It reads a summary of current state (pending tasks, associate availability, customer context) and decides which agent to invoke.

```js
// src/agents/orchestratorAgent.js
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function orchestrate({ intent, context }) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: `You are a routing orchestrator for a luxury retail concierge platform.
Given an intent, return a JSON object: { "agent": "<agent_name>", "reason": "<one line>" }
Agents: task_assignment | customer_intelligence | cart_builder | live_shopping | audit_analysis`,
    messages: [
      {
        role: "user",
        content: `Intent: ${intent}\nContext summary: ${JSON.stringify(context)}`,
      },
    ],
  });
  return JSON.parse(response.content[0].text);
}
```

---

### Agent 2 — Task Assignment Agent

**Enhances:** `src/services/taskAssignmentEngine.js`
**File to create:** `src/agents/taskAssignmentAgent.js`

The existing engine uses a **scoring algorithm** (urgency + tier + aging). The AI agent handles **edge cases the algorithm cannot** — e.g., "this Platinum customer complained last visit, assign the most senior stylist", or "this alteration request needs someone with tailoring experience."

```js
// src/agents/taskAssignmentAgent.js
export async function getAITaskAssignment({ task, associates, auditLog }) {
  // Pass the algorithmic top-3 candidates + task context
  // Agent explains its reasoning → feeds into AuditLog as AI_ASSIGNED entry
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: `You are a task assignment specialist for luxury retail.
You receive a pending task and a shortlist of available associates.
Return JSON: { "assigneeId": string, "confidence": 0-1, "reasoning": string }`,
    messages: [
      {
        role: "user",
        content: buildTaskPrompt(task, associates, auditLog),
      },
    ],
  });
  return JSON.parse(response.content[0].text);
}
```

**Integration point:** Call this from `src/store/useAssignmentStore.js` inside `computeAssignments`, after the algorithm produces candidates, as a tiebreaker or confidence booster. The reasoning string maps directly to your existing `AuditAction.AI_ASSIGNED` audit entry.

---

### Agent 3 — Customer Intelligence Agent

**Enhances:** `src/components/associate/ClientProfile.jsx`
**File to create:** `src/agents/customerIntelligenceAgent.js`

The `Customer` model has `recentPurchases`, `preferences`, `ltv`, `loyaltyPoints`, `visitCount`. The agent synthesizes this into **stylist briefs** — actionable guidance before a client interaction.

```js
// src/agents/customerIntelligenceAgent.js
export async function generateCustomerBrief({ customer, currentTask, products }) {
  // Returns: greeting suggestion, top 3 product recommendations,
  //          upsell opportunity, communication style hint
}
```

**Integration point:** Add a "Get AI Brief" button to the ClientProfile component. When clicked, it calls this agent and renders the brief as a collapsible panel. Zero disruption to existing UI.

---

### Agent 4 — Cart Builder Agent (Agentic Loop with Tools)

**Enhances:** `src/components/associate/CartBuilder.jsx`
**File to create:** `src/agents/cartBuilderAgent.js`

This is the most powerful use case — a **true tool-using agent**. The stylist says "build a summer capsule wardrobe for a Platinum client who likes minimalist style, budget €5000", and the agent uses tools to search products, check inventory, and build the cart.

```js
// src/agents/cartBuilderAgent.js
const tools = [
  {
    name: "search_products",
    description: "Search products by category, color, price range",
    input_schema: {
      type: "object",
      properties: {
        category: { type: "string" },
        maxPrice: { type: "number" },
        colors: { type: "array", items: { type: "string" } },
      },
    },
  },
  {
    name: "check_inventory",
    description: "Check stock availability for a SKU and size",
    input_schema: {
      type: "object",
      properties: {
        sku: { type: "string" },
        size: { type: "string" },
      },
      required: ["sku"],
    },
  },
  {
    name: "add_to_cart",
    description: "Add a product to the client cart",
    input_schema: {
      type: "object",
      properties: { sku: { type: "string" }, quantity: { type: "number" } },
      required: ["sku"],
    },
  },
];

export async function buildCartWithAI({ customerProfile, request, inventory }) {
  // Agentic loop: agent calls tools until cart is complete
  const messages = [{ role: "user", content: request }];

  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      tools,
      system: buildSystemPrompt(customerProfile),
      messages,
    });

    if (response.stop_reason === "end_turn") break;

    if (response.stop_reason === "tool_use") {
      const toolResults = await executeTools(response.content, inventory);
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });
    }
  }
}
```

This is the **"subagent as a worker"** pattern — the cart agent is itself an agentic loop that drives toward a goal using existing product/inventory data.

---

### Agent 5 — Audit Intelligence Agent

**Reads from:** `src/services/auditLogger.js` + `useAssignmentStore` audit log
**File to create:** `src/agents/auditIntelligenceAgent.js`

14 `AuditAction` types and immutable timestamped entries already exist. Feed them to an agent that surfaces **patterns, anomalies, and coaching opportunities** for team leads.

```js
// src/agents/auditIntelligenceAgent.js
export async function analyzeAuditLog({ auditEntries, associates, timeWindow }) {
  // Returns: workload imbalances, associates with high auto-reassign counts,
  //          peak task times, SLA breach risks, coaching flags
}
```

**Integration point:** Add an "AI Insights" tab to `src/pages/TeamLeadDashboard.jsx` that calls this agent on demand or on a 5-minute interval.

---

## Wiring It All Together

### Step 1 — Add the Anthropic SDK

```bash
npm install @anthropic-ai/sdk
```

> **Important:** The app is currently pure frontend. For production, the Anthropic API key **must not** be exposed in browser JS. A thin proxy/backend is required. Options:
> - A Vite-proxied Cloudflare Worker or AWS Lambda (10 lines of code)
> - A local Express server for dev, deployed proxy for prod
> - Vite's built-in `server.proxy` for dev-only
>
> For dev/demo, use a `.env` file with `VITE_ANTHROPIC_API_KEY` and gate the feature behind a dev-only flag — never ship it to production that way.

---

### Step 2 — Create an `AgentContext` in Zustand

Extend `src/store/useAssignmentStore.js`:

```js
// Add to useAssignmentStore
agentState: {
  isThinking: false,           // spinner in UI
  lastAgentAction: null,       // { agent, result, timestamp }
  agentAuditEntries: [],       // AI decisions are auditable
},
setAgentThinking: (val) => set(state => ({
  agentState: { ...state.agentState, isThinking: val }
})),
recordAgentAction: (action) => set(state => ({
  agentState: {
    ...state.agentState,
    lastAgentAction: action,
    agentAuditEntries: [...state.agentState.agentAuditEntries, action],
  }
})),
```

---

### Step 3 — Prompt Caching for Cost Control

System prompts (customer profiles, associate lists, product catalogs) are large and repeated. Use Anthropic's prompt caching to cut costs by ~90% on repeated calls:

```js
// In any agent that sends large static context:
system: [
  {
    type: "text",
    text: LARGE_STATIC_SYSTEM_PROMPT,
    cache_control: { type: "ephemeral" }, // cached for 5 minutes
  },
],
```

---

## Recommended Build Order

| Phase | Agent | Effort | Impact |
|-------|-------|--------|--------|
| 1 | Cart Builder Agent (tools loop) | 2–3 days | Highest — new capability |
| 2 | Customer Intelligence Agent | 1 day | High — visible to every associate |
| 3 | Task Assignment Agent | 1–2 days | Medium — augments existing engine |
| 4 | Audit Intelligence Agent | 1 day | Medium — team lead value |
| 5 | Orchestrator | 1 day | Ties it together |

Start with **Phase 1 (Cart Builder)** because:
- It is a standalone feature (no changes to existing logic)
- The tool-use pattern is the most powerful multi-agent primitive
- It directly demonstrates ROI (stylist productivity)
- `mockData.js` already has all the product/inventory data to power it

---

## Key Files to Create

```
src/
├── agents/
│   ├── orchestratorAgent.js            ← new
│   ├── taskAssignmentAgent.js          ← new
│   ├── customerIntelligenceAgent.js    ← new
│   ├── cartBuilderAgent.js             ← new (start here)
│   └── auditIntelligenceAgent.js       ← new
├── services/
│   ├── agentProxy.js                   ← thin wrapper, handles API key, retries, errors
│   └── toolExecutor.js                 ← maps tool_name → actual function call
└── hooks/
    └── useAgent.js                     ← React hook: { invoke, isThinking, result, error }
```

The `useAgent.js` hook is the clean interface between React components and agent calls. Components never import agents directly — they call `const { invoke, isThinking } = useAgent("cart_builder")`.

---

## Risk: Agent Calls in the Assignment Hot Path

The existing `taskAssignmentEngine.js` has a **200ms SLA warning** for 500 associates. AI agent calls are ~500ms–2s. Never put an agent call in the synchronous assignment hot path.

**Use this pattern instead:**

> **Algorithm first, AI async enrichment second** — the algorithm assigns instantly, the agent optionally re-ranks or adds reasoning, and both are logged to audit.

This ensures the UI stays responsive and AI augments rather than blocks the core flow.
