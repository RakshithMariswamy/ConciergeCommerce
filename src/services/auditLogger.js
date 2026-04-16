/**
 * AuditLogger
 * ───────────
 * Creates structured, immutable audit log entries for every
 * assignment lifecycle event.  Each entry captures:
 *   - WHO performed the action (actorId, actorName, actorRole)
 *   - WHAT changed (action, taskId, associateId)
 *   - WHEN it happened (timestamp)
 *   - WHY it happened (reason)
 *
 * Pure utilities — no side effects.
 */

// ─── ACTION CONSTANTS ────────────────────────────────────────────────────────

export const AuditAction = Object.freeze({
  ASSIGNED: 'ASSIGNED',
  UNASSIGNED: 'UNASSIGNED',
  REASSIGNED: 'REASSIGNED',
  AUTO_REASSIGNED: 'AUTO_REASSIGNED',
  TASK_ACCEPTED: 'TASK_ACCEPTED',
  TASK_COMPLETED: 'TASK_COMPLETED',
  TASK_FLAGGED: 'TASK_FLAGGED',
  TASK_UNFLAGGED: 'TASK_UNFLAGGED',
  CLOCKED_IN: 'CLOCKED_IN',
  CLOCKED_OUT: 'CLOCKED_OUT',
  ON_BREAK: 'ON_BREAK',
  RETURNED_FROM_BREAK: 'RETURNED_FROM_BREAK',
  AUTO_ASSIGN_RUN: 'AUTO_ASSIGN_RUN',
  CONFIG_CHANGED: 'CONFIG_CHANGED',
});

// ─── HUMAN-READABLE LABELS ───────────────────────────────────────────────────

const ACTION_LABELS = {
  [AuditAction.ASSIGNED]: 'Task Assigned',
  [AuditAction.UNASSIGNED]: 'Task Unassigned',
  [AuditAction.REASSIGNED]: 'Task Reassigned',
  [AuditAction.AUTO_REASSIGNED]: 'Auto-Reassigned',
  [AuditAction.TASK_ACCEPTED]: 'Task Accepted',
  [AuditAction.TASK_COMPLETED]: 'Task Completed',
  [AuditAction.TASK_FLAGGED]: 'Task Flagged',
  [AuditAction.TASK_UNFLAGGED]: 'Task Unflagged',
  [AuditAction.CLOCKED_IN]: 'Associate Clocked In',
  [AuditAction.CLOCKED_OUT]: 'Associate Clocked Out',
  [AuditAction.ON_BREAK]: 'Associate On Break',
  [AuditAction.RETURNED_FROM_BREAK]: 'Returned from Break',
  [AuditAction.AUTO_ASSIGN_RUN]: 'Auto-Assignment Run',
  [AuditAction.CONFIG_CHANGED]: 'Configuration Changed',
};

export const formatAuditAction = (action) => ACTION_LABELS[action] ?? action;

// ─── SEVERITY ────────────────────────────────────────────────────────────────

const ACTION_SEVERITY = {
  [AuditAction.ASSIGNED]: 'info',
  [AuditAction.UNASSIGNED]: 'warn',
  [AuditAction.REASSIGNED]: 'warn',
  [AuditAction.AUTO_REASSIGNED]: 'warn',
  [AuditAction.TASK_ACCEPTED]: 'info',
  [AuditAction.TASK_COMPLETED]: 'success',
  [AuditAction.TASK_FLAGGED]: 'error',
  [AuditAction.TASK_UNFLAGGED]: 'info',
  [AuditAction.CLOCKED_IN]: 'info',
  [AuditAction.CLOCKED_OUT]: 'info',
  [AuditAction.ON_BREAK]: 'info',
  [AuditAction.RETURNED_FROM_BREAK]: 'info',
  [AuditAction.AUTO_ASSIGN_RUN]: 'info',
  [AuditAction.CONFIG_CHANGED]: 'warn',
};

export const getAuditSeverity = (action) => ACTION_SEVERITY[action] ?? 'info';

// ─── ENTRY FACTORY ───────────────────────────────────────────────────────────

/**
 * Creates a structured, immutable audit log entry.
 *
 * @param {object} params
 * @param {string} params.action       - One of AuditAction constants
 * @param {string|number} [params.taskId]
 * @param {string} [params.associateId]
 * @param {string} params.actorId      - ID of the user/system performing the action
 * @param {string} params.actorName
 * @param {string} params.actorRole
 * @param {string} [params.reason]     - Optional justification
 * @param {object} [params.metadata]   - Arbitrary extra data
 */
export const createAuditEntry = ({
  action,
  taskId = null,
  associateId = null,
  actorId,
  actorName,
  actorRole,
  reason = null,
  metadata = {},
}) =>
  Object.freeze({
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    action,
    label: formatAuditAction(action),
    severity: getAuditSeverity(action),
    taskId,
    associateId,
    actorId,
    actorName,
    actorRole,
    reason,
    metadata,
  });
