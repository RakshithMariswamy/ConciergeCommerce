# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Frontend (run from repo root):
- `npm run dev` — Vite dev server on port 3000
- `npm run build` — production build to `dist/` (consumed by GitHub Pages workflow)
- `npm run preview` — preview the production build
- `npm test` — run vitest once
- `npm run test:watch` — vitest in watch mode
- `npm run test:coverage` — coverage report (V8 provider; thresholds set to 80% for `src/services`, `src/store`, `src/hooks` in [vitest.config.js](vitest.config.js))
- Run a single test file: `npx vitest run src/tests/taskAssignmentEngine.test.js`
- Run a single test name: `npx vitest run -t "auto-reassigns"`

Backend LLM proxy (optional, required only for Gemini due to CORS):
- `npm run backend:install` — install deps in `backend/`
- `npm run backend:start` — start Express proxy on port 3001
- Health check: `curl http://localhost:3001/health`

Deployment: pushes to `main` deploy to GitHub Pages via [.github/workflows/deploy.yml](.github/workflows/deploy.yml) with `VITE_BASE_PATH=/ConciergeCommerce/`. The workflow copies `dist/index.html` to `dist/404.html` to support SPA deep links.

## Architecture

### Routing and roles
[src/App.jsx](src/App.jsx) wires four routes behind a `<RoleGate>` landing page: `/lead` (TeamLeadDashboard), `/associate` (AssociateDashboard), `/live-shopping` (LiveShoppingDemo). The `Router` `basename` is set from `import.meta.env.BASE_URL` so the app works at a sub-path on GitHub Pages.

`currentUser.role` in [useAssignmentStore](src/store/useAssignmentStore.js) (`Associate | TeamLead | Manager`) drives RBAC — `canOverride()` gates lead-level actions.

### Two Zustand stores (bounded contexts)
- [useAppStore](src/store/useAppStore.js) — tasks, customers, products, inventory, cart, notifications. The customer-facing/commerce domain.
- [useAssignmentStore](src/store/useAssignmentStore.js) — associates, assignment config, pessimistic `locks` (prevent two leads assigning the same task), `auditLog` (capped at 500), `attendanceStatus`, `currentUser`, and `agentState` (AI thinking flag, last action, routing history capped at 20).

Keep this split intact: assignment-layer concerns never go into `useAppStore`, and task data never goes into `useAssignmentStore`.

### Task Assignment Engine
[src/services/taskAssignmentEngine.js](src/services/taskAssignmentEngine.js) is **pure functions, no side effects**, with a hard **<200ms SLA for up to 500 associates** (it logs a warning if it breaches). Composite priority = `URGENCY_WEIGHT + TIER_BONUS + agingBonus` (aging caps at 30 minutes). `findBestAssociate` ranks eligible (on-floor, under `maxTasksPerAssociate`) associates by workload then round-robin by `lastAssignedAt`. `computeAssignments` keeps an optimistic in-batch snapshot so subsequent iterations see updated loads. Auto-reassignment fires when an `Assigned` task is unaccepted past `autoReassignMinutes`.

### Multi-Agent layer
Five agents in [src/agents/](src/agents/): `orchestratorAgent`, `taskAssignmentAgent`, `customerIntelligenceAgent`, `cartBuilderAgent` (tool-using agentic loop), `auditIntelligenceAgent`, plus `sessionPrepAgent` for live-shopping prep.

Components never import agents directly — they go through [useAgent](src/hooks/useAgent.js):
- `invoke(payload)` runs a named specialist.
- `invokeRouted({ intent, context, payloadByAgent })` calls the orchestrator first, then the chosen specialist, recording a routing decision (latency, mode, error) into `agentState.routingHistory`.

The orchestrator routes by JSON output (`{ agent, reason }`). It validates the agent name against `ROUTABLE_AGENTS` and falls back to keyword-based `localRoute` if the LLM is disabled or returns garbage.

**Hot-path rule:** the assignment engine runs synchronously; AI calls (500ms–2s) never block it. Pattern is *algorithm first, AI async enrichment second* — the algorithm assigns instantly and the agent optionally re-ranks or adds reasoning, both logged to audit.

### LLM provider abstraction
[src/services/agentProxy.js](src/services/agentProxy.js) is the single entry point. `callAgentRaw` returns a canonical `{ content: [...], stop_reason, _provider, _raw }` regardless of provider. `callAgentJson` parses the first text block as JSON (with a brace-extraction fallback).

Provider selection (`anthropic | openai | gemini`) via `VITE_LLM_PROVIDER`. Defaults: Anthropic→`claude-sonnet-4-6`, OpenAI→`gpt-4o`, Gemini→`gemini-2.0-flash`. Override globally with `VITE_LLM_MODEL`.

Routing:
- If `VITE_LLM_PROXY_URL` is set → all providers go through [proxyAdapter](src/services/llmAdapters/proxyAdapter.js) → backend Express server.
- Otherwise direct adapters in [src/services/llmAdapters/](src/services/llmAdapters/) — works for Anthropic/OpenAI from the browser, **fails for Gemini (CORS)**.

`isAgentEnabled()` gates AI calls — returns false unless `import.meta.env.DEV`, `VITE_ENABLE_AGENTS !== 'false'`, and a key is set. Agents detect this and fall back to local heuristics (e.g. `localCartBuild` in cartBuilderAgent, regex routing in orchestrator). This means **the app always works without keys** — AI augments rather than blocks.

Retries (`withRetry`): 2 retries by default; rate-limit errors back off exponentially (2s→4s), others linearly (250ms→500ms). Errors with `retryable === false` skip retry.

⚠️ Browser API keys are exposed via `dangerouslyAllowBrowser: true` — dev/demo only. Production must proxy.

### Cart Builder agentic loop
[src/agents/cartBuilderAgent.js](src/agents/cartBuilderAgent.js) is the canonical tool-using agent. Tools (`search_products`, `check_inventory`, `add_to_cart`) are declared in `CART_TOOLS` and executed by [src/services/toolExecutor.js](src/services/toolExecutor.js). The loop runs up to 6 iterations: call LLM → if `stop_reason === 'tool_use'` execute the tool blocks and append results → repeat until `end_turn`. The system prompt uses Anthropic prompt caching (`cache_control: { type: 'ephemeral' }`) because the catalog/customer context is large and repeated.

### Audit logging
[src/services/auditLogger.js](src/services/auditLogger.js) exports a frozen `AuditAction` enum and a `createAuditEntry` factory that produces immutable entries with severity. Every state-changing store action writes an entry. New action types must be added to both `AuditAction` and `ACTION_LABELS`/`ACTION_SEVERITY` maps.

### Live Shopping feature
[src/features/liveShopping/](src/features/liveShopping/) is a self-contained feature module (own `context/SessionBagContext`, `components/`, `adapters/realtimeAdapters.js`). The `SessionBagProvider` wraps the room; consumers use `useSessionBag()` rather than touching the global stores directly. Real-time adapters are pluggable so it can be wired to different transports.

## Environment

Two separate `.env` files:
- Root `.env` (frontend) — `VITE_*` keys; see [.env.example](.env.example). At minimum set `VITE_LLM_PROVIDER` and the matching `VITE_<PROVIDER>_API_KEY`, or omit keys to run in local-fallback mode.
- `backend/.env` — `GEMINI_API_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` for the proxy server.

For Gemini you **must** run the backend and set `VITE_LLM_PROXY_URL=http://localhost:3001/api/llm` in the frontend `.env`.

## Conventions

- The codebase is plain JavaScript + JSX (no TypeScript). React 18, React Router v6, Zustand 4, Tailwind 3.
- Tests live in [src/tests/](src/tests/) using vitest + jsdom + `@testing-library/react`. Setup file: [src/tests/setup.js](src/tests/setup.js).
- Mock data (`mockAssociates`, `mockCustomers`, `mockProducts`, `mockInventory`, `initialTasks`) is the source of truth for demo state and lives in [src/data/mockData.js](src/data/mockData.js).
- When adding a new agent: create the file in `src/agents/`, wire it into `AGENT_MAP` in [useAgent.js](src/hooks/useAgent.js), add it to `ROUTABLE_AGENTS` in [orchestratorAgent.js](src/agents/orchestratorAgent.js) (and update the system prompt + `localRoute` keywords), and always provide a local-fallback path so the agent works without an API key.
