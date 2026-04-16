/**
 * Task Assignment Engine
 * ──────────────────────
 * Pure functions — zero side-effects, fully testable.
 * SLA: computeAssignments must complete in < 200ms for up to 500 associates.
 *
 * Design: SOLID / Clean Architecture
 *   S – Each function has one responsibility
 *   O – Extensible priority/scoring without modifying core
 *   L – Substitutable config shapes
 *   I – No interface pollution
 *   D – Depends only on plain data, never on stores/hooks
 */

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const URGENCY_WEIGHT = { high: 10, normal: 5, low: 1 };
const TIER_BONUS = { Platinum: 4, Gold: 2, Silver: 1 };
const AGING_CAP_MINUTES = 30; // Age bonus caps at this many minutes waiting

// ─── PRIORITY SCORING ────────────────────────────────────────────────────────

/**
 * Calculates a composite priority score for a task.
 * Higher score = serve first.
 *
 * Score = urgency_weight + customer_tier_bonus + aging_bonus
 */
export const calcTaskPriority = (task) => {
  const urgency = URGENCY_WEIGHT[task.urgency] ?? URGENCY_WEIGHT.normal;
  const tier = TIER_BONUS[task.customerTier] ?? 0;
  const ageMs = Date.now() - new Date(task.receivedAt).getTime();
  const ageMinutes = ageMs / 60000;
  // Aging bonus: linearly grows to +3 over AGING_CAP_MINUTES
  const agingBonus = Math.min(ageMinutes / AGING_CAP_MINUTES, 1) * 3;
  return urgency + tier + agingBonus;
};

/**
 * Returns only Pending tasks, sorted highest priority first.
 */
export const prioritizeTasks = (tasks) =>
  tasks
    .filter((t) => t.status === 'Pending')
    .slice() // avoid mutating input
    .sort((a, b) => calcTaskPriority(b) - calcTaskPriority(a));

// ─── WORKLOAD CALCULATION ────────────────────────────────────────────────────

/**
 * Counts active workload for an associate.
 * Both 'Assigned' (pending acceptance) and 'Active' (in-progress) count.
 */
export const getAssociateWorkload = (associateId, tasks) =>
  tasks.filter(
    (t) =>
      t.assigneeId === associateId &&
      (t.status === 'Assigned' || t.status === 'Active')
  ).length;

// ─── AVAILABILITY CHECK ──────────────────────────────────────────────────────

/**
 * Returns true if the associate can receive another task.
 * Rules: clocked in, not on break, below max workload threshold.
 */
export const isAssociateAvailable = (associate, tasks, config) => {
  if (associate.attendanceStatus !== 'on-floor') return false;
  return getAssociateWorkload(associate.id, tasks) < config.maxTasksPerAssociate;
};

// ─── SELECTION ALGORITHM ─────────────────────────────────────────────────────

/**
 * Selects the best eligible associate for a given task.
 *
 * Ranking: lower workload first → then round-robin by lastAssignedAt
 * (ensures fair distribution across equally-loaded associates).
 *
 * Returns null when nobody is available (Queue tasks per Zero Availability spec).
 */
export const findBestAssociate = (task, associates, tasks, config) => {
  const eligible = associates.filter((a) =>
    isAssociateAvailable(a, tasks, config)
  );

  if (eligible.length === 0) return null;

  eligible.sort((a, b) => {
    const aLoad = getAssociateWorkload(a.id, tasks);
    const bLoad = getAssociateWorkload(b.id, tasks);
    if (aLoad !== bLoad) return aLoad - bLoad;

    // Round-robin tiebreaker — prefer the associate who was assigned longest ago
    const aLast = a.lastAssignedAt ? new Date(a.lastAssignedAt).getTime() : 0;
    const bLast = b.lastAssignedAt ? new Date(b.lastAssignedAt).getTime() : 0;
    return aLast - bLast;
  });

  return eligible[0];
};

// ─── MAIN ASSIGNMENT ALGORITHM ───────────────────────────────────────────────

/**
 * Computes the optimal batch of assignments for all pending tasks.
 *
 * Algorithm:
 *  1. Filter to Pending tasks
 *  2. Sort by priority score (descending)
 *  3. For each task: find the best available associate
 *  4. Update an in-memory snapshot so subsequent iterations see updated loads
 *
 * Returns { assignments: [{ taskId, associateId }], elapsedMs }
 * Logs a warning if execution exceeds the 200ms SLA.
 */
export const computeAssignments = (tasks, associates, config) => {
  const startTime = performance.now();

  const pending = prioritizeTasks(tasks);
  const result = [];

  // Working snapshot — updated optimistically as we assign within this batch
  const taskSnapshot = [...tasks];

  for (const task of pending) {
    const best = findBestAssociate(task, associates, taskSnapshot, config);
    if (!best) continue; // Zero-availability: leave task queued

    result.push({ taskId: task.id, associateId: best.id });

    // Optimistic update so next iteration sees this load increase
    const idx = taskSnapshot.findIndex((t) => t.id === task.id);
    if (idx !== -1) {
      taskSnapshot[idx] = {
        ...taskSnapshot[idx],
        assigneeId: best.id,
        status: 'Assigned',
      };
    } else {
      taskSnapshot.push({ ...task, assigneeId: best.id, status: 'Assigned' });
    }
  }

  const elapsedMs = performance.now() - startTime;

  if (elapsedMs > 200) {
    console.warn(
      `[AssignmentEngine] SLA breach: ${elapsedMs.toFixed(1)}ms (limit 200ms). ` +
        `Tasks: ${tasks.length}, Associates: ${associates.length}`
    );
  }

  return { assignments: result, elapsedMs };
};

// ─── AUTO-REASSIGNMENT ───────────────────────────────────────────────────────

/**
 * Returns true if a task in 'Assigned' state has not been accepted
 * within the configured window (autoReassignMinutes).
 */
export const shouldAutoReassign = (task, config) => {
  if (task.status !== 'Assigned' || !task.assignedAt) return false;
  const minutesElapsed =
    (Date.now() - new Date(task.assignedAt).getTime()) / 60000;
  return minutesElapsed >= config.autoReassignMinutes;
};

/**
 * Filters the task list to those requiring auto-reassignment.
 */
export const getExpiredAssignments = (tasks, config) =>
  tasks.filter((t) => shouldAutoReassign(t, config));
