/**
 * useAutoReassignment
 * ───────────────────
 * Runs a periodic check for tasks in 'Assigned' state that have exceeded
 * the acceptance timeout (config.autoReassignMinutes).
 *
 * On expiry:
 *  1. Returns the task to 'Pending' (unassign)
 *  2. Emits an AUTO_REASSIGNED audit entry
 *  3. Triggers a fresh computeAssignments run so the task is immediately
 *     re-evaluated against available associates.
 *
 * Satisfies the "Auto-Reassignment" functional requirement.
 */

import { useEffect, useRef } from 'react';
import useAppStore from '../store/useAppStore';
import useAssignmentStore from '../store/useAssignmentStore';
import { getExpiredAssignments, computeAssignments } from '../services/taskAssignmentEngine';
import { createAuditEntry, AuditAction } from '../services/auditLogger';

const CHECK_INTERVAL_MS = 30_000; // Check every 30 seconds

export const useAutoReassignment = () => {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const check = () => {
      // Read current state snapshots (avoid stale closure)
      const { tasks, unassignTask, assignTaskToAssociate } = useAppStore.getState();
      const {
        config,
        associates,
        addAuditEntry,
        markAssociateAssigned,
        releaseLock,
      } = useAssignmentStore.getState();

      // ── Step 1: Expire overdue assignments ──
      const expired = getExpiredAssignments(tasks, config);

      expired.forEach((task) => {
        releaseLock(task.id);
        unassignTask(task.id);
        addAuditEntry(
          createAuditEntry({
            action: AuditAction.AUTO_REASSIGNED,
            taskId: task.id,
            associateId: task.assigneeId,
            actorId: 'system',
            actorName: 'System',
            actorRole: 'System',
            reason: `Not accepted within ${config.autoReassignMinutes} minute(s)`,
            metadata: { autoReassignCount: (task.autoReassignCount ?? 0) + 1 },
          })
        );
      });

      if (expired.length === 0) return;

      // ── Step 2: Re-run assignment engine on fresh state ──
      const freshTasks = useAppStore.getState().tasks;
      const { assignments } = computeAssignments(freshTasks, associates, config);

      assignments.forEach(({ taskId, associateId }) => {
        assignTaskToAssociate(taskId, associateId);
        markAssociateAssigned(associateId);
        addAuditEntry(
          createAuditEntry({
            action: AuditAction.ASSIGNED,
            taskId,
            associateId,
            actorId: 'system',
            actorName: 'System (Auto-Reassign)',
            actorRole: 'System',
            reason: 'Triggered by auto-reassignment cycle',
          })
        );
      });
    };

    const intervalId = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
};
