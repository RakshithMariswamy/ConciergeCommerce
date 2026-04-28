import { useCallback, useMemo, useState } from 'react';
import useAssignmentStore from '../store/useAssignmentStore';
import { buildCartWithAI } from '../agents/cartBuilderAgent';
import { generateCustomerBrief } from '../agents/customerIntelligenceAgent';
import { getAITaskAssignment } from '../agents/taskAssignmentAgent';
import { analyzeAuditLog } from '../agents/auditIntelligenceAgent';
import { orchestrate } from '../agents/orchestratorAgent';
import { isAgentEnabled } from '../services/agentProxy';

const AGENT_MAP = {
  orchestrator: orchestrate,
  task_assignment: getAITaskAssignment,
  customer_intelligence: generateCustomerBrief,
  cart_builder: buildCartWithAI,
  audit_analysis: analyzeAuditLog,
};

const SPECIALIST_AGENTS = [
  'task_assignment',
  'customer_intelligence',
  'cart_builder',
  'audit_analysis',
];

export function useAgent(agentName) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const setAgentThinking = useAssignmentStore((s) => s.setAgentThinking);
  const recordAgentAction = useAssignmentStore((s) => s.recordAgentAction);
  const recordRoutingDecision = useAssignmentStore((s) => s.recordRoutingDecision);
  const isThinking = useAssignmentStore((s) => s.agentState?.isThinking || false);

  const invoke = useCallback(
    async (payload) => {
      const runner = AGENT_MAP[agentName];
      if (!runner) {
        const err = new Error(`Unknown agent: ${agentName}`);
        setError(err);
        throw err;
      }

      setError(null);
      setAgentThinking(true);

      try {
        const output = await runner(payload || {});
        const action = {
          agent: agentName,
          result: output,
          timestamp: new Date().toISOString(),
        };
        recordAgentAction(action);
        setResult(output);
        return output;
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setAgentThinking(false);
      }
    },
    [agentName, recordAgentAction, setAgentThinking]
  );

  const invokeRouted = useCallback(
    async ({ intent, context, payloadByAgent = {}, defaultPayload = {}, execute = true } = {}) => {
      setError(null);
      setAgentThinking(true);

      const totalStart = performance.now();
      let routeMs = null;
      let execMs = null;
      let routedAgent = null;
      let routeReason = null;
      let decisionError = null;

      try {
        const routeStart = performance.now();
        const route = await orchestrate({ intent, context });
        routeMs = Math.round(performance.now() - routeStart);
        routedAgent = route?.agent;
        routeReason = route?.reason;

        if (!routedAgent || !SPECIALIST_AGENTS.includes(routedAgent)) {
          throw new Error(`Orchestrator returned unsupported agent: ${String(routedAgent)}`);
        }

        if (!execute) {
          const routeOnly = {
            route,
            executed: false,
            result: null,
          };
          recordAgentAction({
            agent: 'orchestrator',
            result: routeOnly,
            timestamp: new Date().toISOString(),
          });
          setResult(routeOnly);
          return routeOnly;
        }

        const specialistRunner = AGENT_MAP[routedAgent];
        const specialistPayload = payloadByAgent[routedAgent] ?? defaultPayload;

        const execStart = performance.now();
        const specialistResult = await specialistRunner(specialistPayload || {});
        execMs = Math.round(performance.now() - execStart);

        const combined = {
          route,
          executed: true,
          result: specialistResult,
        };

        recordAgentAction({
          agent: `orchestrator:${routedAgent}`,
          result: combined,
          timestamp: new Date().toISOString(),
        });
        setResult(combined);
        return combined;
      } catch (err) {
        decisionError = err.message || String(err);
        setError(err);
        throw err;
      } finally {
        const totalMs = Math.round(performance.now() - totalStart);
        recordRoutingDecision({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          source: context?.source || 'unknown',
          intent: String(intent || '').slice(0, 120),
          routedAgent: routedAgent || null,
          routeReason: routeReason || null,
          routeMs,
          execMs,
          totalMs,
          mode: isAgentEnabled() ? 'remote' : 'local',
          error: decisionError,
          timestamp: new Date().toISOString(),
        });
        setAgentThinking(false);
      }
    },
    [recordAgentAction, recordRoutingDecision, setAgentThinking]
  );

  return useMemo(
    () => ({ invoke, invokeRouted, isThinking, result, error }),
    [invoke, invokeRouted, isThinking, result, error]
  );
}

export default useAgent;
