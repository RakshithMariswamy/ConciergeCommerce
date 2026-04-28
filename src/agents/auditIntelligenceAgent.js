import { callAgentJson, isAgentEnabled } from '../services/agentProxy';

const byId = (arr, id) => arr.find((x) => x.id === id);

const localAnalysis = ({ auditEntries = [], associates = [], timeWindowMinutes = 60 }) => {
  const now = Date.now();
  const cutoff = now - timeWindowMinutes * 60000;

  const windowEntries = auditEntries.filter((entry) => new Date(entry.timestamp).getTime() >= cutoff);

  const autoReassignCounts = {};
  const assignmentCounts = {};
  const hourlyCounts = {};

  windowEntries.forEach((entry) => {
    if (entry.action === 'AUTO_REASSIGNED') {
      autoReassignCounts[entry.associateId] = (autoReassignCounts[entry.associateId] || 0) + 1;
    }

    if (entry.action === 'ASSIGNED' || entry.action === 'AI_ASSIGNED') {
      assignmentCounts[entry.associateId] = (assignmentCounts[entry.associateId] || 0) + 1;
    }

    const hour = new Date(entry.timestamp).getHours();
    hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
  });

  const workloadImbalances = Object.entries(assignmentCounts)
    .map(([associateId, count]) => ({
      associateId,
      associateName: byId(associates, associateId)?.name || associateId,
      assignmentCount: count,
    }))
    .sort((a, b) => b.assignmentCount - a.assignmentCount);

  const coachingFlags = Object.entries(autoReassignCounts)
    .filter(([, count]) => count >= 2)
    .map(([associateId, count]) => ({
      associateId,
      associateName: byId(associates, associateId)?.name || associateId,
      autoReassignCount: count,
      note: 'Repeated auto-reassignment suggests follow-up coaching opportunity.',
    }));

  const peakTaskHours = Object.entries(hourlyCounts)
    .map(([hour, count]) => ({ hour: Number(hour), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return {
    workloadImbalances,
    autoReassignLeaders: coachingFlags,
    peakTaskHours,
    slaBreachRisk: coachingFlags.length > 0 ? 'moderate' : 'low',
    coachingFlags,
    summary: `Analyzed ${windowEntries.length} entries over the last ${timeWindowMinutes} minutes.`,
  };
};

export async function analyzeAuditLog({ auditEntries, associates, timeWindowMinutes = 60 }) {
  if (!isAgentEnabled()) {
    return localAnalysis({ auditEntries, associates, timeWindowMinutes });
  }

  try {
    const result = await callAgentJson({
      maxTokens: 1200,
      system: [
        {
          type: 'text',
          text: 'You analyze retail operations audit events. Return JSON with keys: workloadImbalances, autoReassignLeaders, peakTaskHours, slaBreachRisk, coachingFlags, summary.',
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: JSON.stringify({
            timeWindowMinutes,
            associates,
            auditEntries: (auditEntries || []).slice(0, 300),
          }),
        },
      ],
    });

    if (!result?.summary) {
      return localAnalysis({ auditEntries, associates, timeWindowMinutes });
    }

    return result;
  } catch (_err) {
    return localAnalysis({ auditEntries, associates, timeWindowMinutes });
  }
}
