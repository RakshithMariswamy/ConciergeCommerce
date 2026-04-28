import { callAgentJson, isAgentEnabled } from '../services/agentProxy';
import { getAssociateWorkload } from '../services/taskAssignmentEngine';

const topCandidates = (task, associates, tasks, limit = 3) =>
  associates
    .filter((a) => a.attendanceStatus === 'on-floor')
    .map((associate) => ({
      id: associate.id,
      name: associate.name,
      department: associate.department,
      role: associate.role,
      workload: getAssociateWorkload(associate.id, tasks),
      lastAssignedAt: associate.lastAssignedAt,
    }))
    .sort((a, b) => a.workload - b.workload)
    .slice(0, limit);

const localTaskDecision = ({ task, candidates }) => {
  if (!candidates.length) {
    return {
      assigneeId: null,
      confidence: 0,
      reasoning: 'No on-floor associates available.',
    };
  }

  const preferSeniorForVip =
    task.customerTier === 'Platinum'
      ? [...candidates].sort((a, b) => (a.role === 'TeamLead' ? -1 : 1))[0]
      : null;

  const selected = preferSeniorForVip || candidates[0];

  return {
    assigneeId: selected.id,
    confidence: 0.62,
    reasoning:
      task.customerTier === 'Platinum'
        ? `VIP-sensitive task routed to ${selected.name} for senior handling.`
        : `${selected.name} selected due to best current workload balance.`,
  };
};

export async function getAITaskAssignment({ task, associates, tasks, auditLog }) {
  const candidates = topCandidates(task, associates, tasks);

  if (!isAgentEnabled()) {
    return localTaskDecision({ task, candidates });
  }

  try {
    const result = await callAgentJson({
      maxTokens: 700,
      system: [
        {
          type: 'text',
          text: 'You are a task assignment specialist for luxury retail. Return JSON only: {"assigneeId":string|null,"confidence":number,"reasoning":string}.',
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: JSON.stringify({
            task,
            candidates,
            recentAudit: (auditLog || []).slice(0, 15),
          }),
        },
      ],
    });

    if (!result || typeof result.reasoning !== 'string') {
      return localTaskDecision({ task, candidates });
    }

    return {
      assigneeId: result.assigneeId ?? candidates[0]?.id ?? null,
      confidence: Number(result.confidence ?? 0.5),
      reasoning: result.reasoning,
    };
  } catch (_err) {
    return localTaskDecision({ task, candidates });
  }
}
