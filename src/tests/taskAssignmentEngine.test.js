/**
 * Unit Tests — Task Assignment Engine
 * ─────────────────────────────────────
 * Tests all pure functions in taskAssignmentEngine.js.
 * Target: ≥ 80% line/branch coverage.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calcTaskPriority,
  prioritizeTasks,
  getAssociateWorkload,
  isAssociateAvailable,
  findBestAssociate,
  computeAssignments,
  shouldAutoReassign,
  getExpiredAssignments,
} from '../services/taskAssignmentEngine';

// ─── FIXTURES ────────────────────────────────────────────────────────────────

const makeTask = (overrides = {}) => ({
  id: 1,
  type: 'Assistance',
  customer: 'Test Customer',
  customerId: null,
  customerTier: null,
  item: 'Test Item',
  location: 'Floor',
  status: 'Pending',
  urgency: 'normal',
  assigneeId: null,
  assignedAt: null,
  autoReassignCount: 0,
  receivedAt: new Date().toISOString(),
  ...overrides,
});

const makeAssociate = (overrides = {}) => ({
  id: 'assoc-test-1',
  name: 'Test Associate',
  initials: 'TA',
  role: 'Associate',
  department: 'General',
  attendanceStatus: 'on-floor',
  lastAssignedAt: null,
  ...overrides,
});

const DEFAULT_CONFIG = {
  maxTasksPerAssociate: 3,
  autoReassignMinutes: 5,
};

// ─── calcTaskPriority ────────────────────────────────────────────────────────

describe('calcTaskPriority', () => {
  it('returns higher score for high urgency than normal', () => {
    const high = makeTask({ urgency: 'high' });
    const normal = makeTask({ urgency: 'normal' });
    expect(calcTaskPriority(high)).toBeGreaterThan(calcTaskPriority(normal));
  });

  it('adds tier bonus for Platinum customers', () => {
    const vip = makeTask({ customerTier: 'Platinum' });
    const standard = makeTask({ customerTier: null });
    expect(calcTaskPriority(vip)).toBeGreaterThan(calcTaskPriority(standard));
  });

  it('adds aging bonus for older tasks', () => {
    const fresh = makeTask({ receivedAt: new Date().toISOString() });
    const old = makeTask({
      receivedAt: new Date(Date.now() - 45 * 60000).toISOString(),
    });
    expect(calcTaskPriority(old)).toBeGreaterThan(calcTaskPriority(fresh));
  });

  it('caps aging bonus at 3 points', () => {
    const veryOld = makeTask({
      receivedAt: new Date(Date.now() - 10 * 3600000).toISOString(),
    });
    const old = makeTask({
      receivedAt: new Date(Date.now() - 60 * 60000).toISOString(),
    });
    // Both are past the cap so scores should be equal on aging component
    const diffAtCap = calcTaskPriority(veryOld) - calcTaskPriority(old);
    expect(Math.abs(diffAtCap)).toBeLessThan(0.1);
  });

  it('defaults to normal urgency weight for unknown urgency', () => {
    const task = makeTask({ urgency: 'unknown' });
    const normal = makeTask({ urgency: 'normal' });
    expect(calcTaskPriority(task)).toBeCloseTo(calcTaskPriority(normal), 1);
  });
});

// ─── prioritizeTasks ─────────────────────────────────────────────────────────

describe('prioritizeTasks', () => {
  it('returns only Pending tasks', () => {
    const tasks = [
      makeTask({ id: 1, status: 'Pending' }),
      makeTask({ id: 2, status: 'Active' }),
      makeTask({ id: 3, status: 'Assigned' }),
      makeTask({ id: 4, status: 'Completed' }),
    ];
    const result = prioritizeTasks(tasks);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('sorts high-urgency tasks before normal-urgency', () => {
    const tasks = [
      makeTask({ id: 1, urgency: 'normal', status: 'Pending' }),
      makeTask({ id: 2, urgency: 'high', status: 'Pending' }),
    ];
    const result = prioritizeTasks(tasks);
    expect(result[0].id).toBe(2);
  });

  it('sorts Platinum VIP before Silver for same urgency', () => {
    const tasks = [
      makeTask({ id: 1, customerTier: 'Silver', urgency: 'normal', status: 'Pending' }),
      makeTask({ id: 2, customerTier: 'Platinum', urgency: 'normal', status: 'Pending' }),
    ];
    const result = prioritizeTasks(tasks);
    expect(result[0].id).toBe(2);
  });

  it('does not mutate the input array', () => {
    const tasks = [
      makeTask({ id: 1, urgency: 'normal', status: 'Pending' }),
      makeTask({ id: 2, urgency: 'high', status: 'Pending' }),
    ];
    const original = [...tasks];
    prioritizeTasks(tasks);
    expect(tasks[0].id).toBe(original[0].id);
  });

  it('returns empty array when no pending tasks', () => {
    const tasks = [makeTask({ status: 'Completed' })];
    expect(prioritizeTasks(tasks)).toHaveLength(0);
  });
});

// ─── getAssociateWorkload ────────────────────────────────────────────────────

describe('getAssociateWorkload', () => {
  it('counts Assigned and Active tasks', () => {
    const tasks = [
      makeTask({ id: 1, assigneeId: 'a1', status: 'Assigned' }),
      makeTask({ id: 2, assigneeId: 'a1', status: 'Active' }),
      makeTask({ id: 3, assigneeId: 'a1', status: 'Completed' }), // excluded
      makeTask({ id: 4, assigneeId: 'a2', status: 'Assigned' }), // different associate
    ];
    expect(getAssociateWorkload('a1', tasks)).toBe(2);
  });

  it('returns 0 when associate has no tasks', () => {
    expect(getAssociateWorkload('a1', [])).toBe(0);
  });

  it('does not count Pending or Flagged tasks', () => {
    const tasks = [
      makeTask({ assigneeId: 'a1', status: 'Pending' }),
      makeTask({ assigneeId: 'a1', status: 'Flagged' }),
    ];
    expect(getAssociateWorkload('a1', tasks)).toBe(0);
  });
});

// ─── isAssociateAvailable ────────────────────────────────────────────────────

describe('isAssociateAvailable', () => {
  it('returns true for on-floor associate below max workload', () => {
    const assoc = makeAssociate({ attendanceStatus: 'on-floor' });
    expect(isAssociateAvailable(assoc, [], DEFAULT_CONFIG)).toBe(true);
  });

  it('returns false when on-break', () => {
    const assoc = makeAssociate({ attendanceStatus: 'on-break' });
    expect(isAssociateAvailable(assoc, [], DEFAULT_CONFIG)).toBe(false);
  });

  it('returns false when clocked-out', () => {
    const assoc = makeAssociate({ attendanceStatus: 'clocked-out' });
    expect(isAssociateAvailable(assoc, [], DEFAULT_CONFIG)).toBe(false);
  });

  it('returns false when at max workload', () => {
    const assoc = makeAssociate({ id: 'a1', attendanceStatus: 'on-floor' });
    const tasks = Array.from({ length: 3 }, (_, i) =>
      makeTask({ id: i, assigneeId: 'a1', status: 'Active' })
    );
    expect(isAssociateAvailable(assoc, tasks, DEFAULT_CONFIG)).toBe(false);
  });

  it('returns true when below (not at) max workload', () => {
    const assoc = makeAssociate({ id: 'a1', attendanceStatus: 'on-floor' });
    const tasks = Array.from({ length: 2 }, (_, i) =>
      makeTask({ id: i, assigneeId: 'a1', status: 'Active' })
    );
    expect(isAssociateAvailable(assoc, tasks, DEFAULT_CONFIG)).toBe(true);
  });
});

// ─── findBestAssociate ───────────────────────────────────────────────────────

describe('findBestAssociate', () => {
  it('returns null when no associates are available', () => {
    const assoc = makeAssociate({ attendanceStatus: 'clocked-out' });
    const task = makeTask();
    expect(findBestAssociate(task, [assoc], [], DEFAULT_CONFIG)).toBeNull();
  });

  it('returns the associate with the lowest workload', () => {
    const a1 = makeAssociate({ id: 'a1', attendanceStatus: 'on-floor' });
    const a2 = makeAssociate({ id: 'a2', attendanceStatus: 'on-floor' });
    const tasks = [
      makeTask({ id: 1, assigneeId: 'a1', status: 'Active' }),
      makeTask({ id: 2, assigneeId: 'a1', status: 'Active' }),
    ];
    const task = makeTask({ id: 99 });
    const best = findBestAssociate(task, [a1, a2], tasks, DEFAULT_CONFIG);
    expect(best?.id).toBe('a2');
  });

  it('round-robins among equally loaded associates', () => {
    const now = Date.now();
    const a1 = makeAssociate({
      id: 'a1',
      attendanceStatus: 'on-floor',
      lastAssignedAt: new Date(now - 5000).toISOString(), // more recently assigned
    });
    const a2 = makeAssociate({
      id: 'a2',
      attendanceStatus: 'on-floor',
      lastAssignedAt: new Date(now - 60000).toISOString(), // longer ago
    });
    const task = makeTask({ id: 99 });
    const best = findBestAssociate(task, [a1, a2], [], DEFAULT_CONFIG);
    expect(best?.id).toBe('a2'); // Assigned longer ago → goes first
  });

  it('does not assign when all associates are at max capacity', () => {
    const associates = [
      makeAssociate({ id: 'a1', attendanceStatus: 'on-floor' }),
    ];
    const tasks = Array.from({ length: 3 }, (_, i) =>
      makeTask({ id: i, assigneeId: 'a1', status: 'Active' })
    );
    const task = makeTask({ id: 99 });
    expect(findBestAssociate(task, associates, tasks, DEFAULT_CONFIG)).toBeNull();
  });
});

// ─── computeAssignments ──────────────────────────────────────────────────────

describe('computeAssignments', () => {
  it('assigns pending tasks to available associates', () => {
    const tasks = [makeTask({ id: 1, status: 'Pending' })];
    const associates = [makeAssociate({ id: 'a1', attendanceStatus: 'on-floor' })];
    const { assignments } = computeAssignments(tasks, associates, DEFAULT_CONFIG);
    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toEqual({ taskId: 1, associateId: 'a1' });
  });

  it('assigns high-priority tasks first', () => {
    const tasks = [
      makeTask({ id: 1, urgency: 'normal', status: 'Pending' }),
      makeTask({ id: 2, urgency: 'high', status: 'Pending' }),
    ];
    const associates = [
      makeAssociate({ id: 'a1', attendanceStatus: 'on-floor' }),
    ];
    const config = { ...DEFAULT_CONFIG, maxTasksPerAssociate: 1 };
    const { assignments } = computeAssignments(tasks, associates, config);
    // Only one slot — should go to the high-priority task
    expect(assignments).toHaveLength(1);
    expect(assignments[0].taskId).toBe(2);
  });

  it('returns empty when no pending tasks', () => {
    const tasks = [makeTask({ status: 'Active' })];
    const associates = [makeAssociate({ attendanceStatus: 'on-floor' })];
    const { assignments } = computeAssignments(tasks, associates, DEFAULT_CONFIG);
    expect(assignments).toHaveLength(0);
  });

  it('returns empty when no associates available', () => {
    const tasks = [makeTask({ status: 'Pending' })];
    const associates = [makeAssociate({ attendanceStatus: 'clocked-out' })];
    const { assignments } = computeAssignments(tasks, associates, DEFAULT_CONFIG);
    expect(assignments).toHaveLength(0);
  });

  it('distributes multiple tasks across multiple associates', () => {
    const tasks = [
      makeTask({ id: 1, status: 'Pending' }),
      makeTask({ id: 2, status: 'Pending' }),
    ];
    const associates = [
      makeAssociate({ id: 'a1', attendanceStatus: 'on-floor' }),
      makeAssociate({ id: 'a2', attendanceStatus: 'on-floor' }),
    ];
    const config = { ...DEFAULT_CONFIG, maxTasksPerAssociate: 1 };
    const { assignments } = computeAssignments(tasks, associates, config);
    expect(assignments).toHaveLength(2);
    // Each task should go to a different associate
    const ids = assignments.map((a) => a.associateId);
    expect(new Set(ids).size).toBe(2);
  });

  it('returns elapsedMs in the result', () => {
    const { elapsedMs } = computeAssignments([], [], DEFAULT_CONFIG);
    expect(typeof elapsedMs).toBe('number');
    expect(elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it('completes within the 200ms SLA for 500 associates and 100 tasks', () => {
    const associates = Array.from({ length: 500 }, (_, i) =>
      makeAssociate({ id: `a${i}`, attendanceStatus: 'on-floor' })
    );
    const tasks = Array.from({ length: 100 }, (_, i) =>
      makeTask({ id: i, status: 'Pending' })
    );
    const { elapsedMs } = computeAssignments(tasks, associates, DEFAULT_CONFIG);
    expect(elapsedMs).toBeLessThan(200);
  });

  it('does not mutate the original tasks array', () => {
    const tasks = [makeTask({ id: 1, status: 'Pending' })];
    const original = JSON.stringify(tasks);
    computeAssignments(tasks, [], DEFAULT_CONFIG);
    expect(JSON.stringify(tasks)).toBe(original);
  });
});

// ─── shouldAutoReassign ──────────────────────────────────────────────────────

describe('shouldAutoReassign', () => {
  it('returns true when assignment window has passed', () => {
    const task = makeTask({
      status: 'Assigned',
      assignedAt: new Date(Date.now() - 6 * 60000).toISOString(), // 6 mins ago
    });
    expect(shouldAutoReassign(task, DEFAULT_CONFIG)).toBe(true);
  });

  it('returns false when within the window', () => {
    const task = makeTask({
      status: 'Assigned',
      assignedAt: new Date(Date.now() - 2 * 60000).toISOString(), // 2 mins ago
    });
    expect(shouldAutoReassign(task, DEFAULT_CONFIG)).toBe(false);
  });

  it('returns false for non-Assigned tasks', () => {
    const task = makeTask({
      status: 'Active',
      assignedAt: new Date(Date.now() - 10 * 60000).toISOString(),
    });
    expect(shouldAutoReassign(task, DEFAULT_CONFIG)).toBe(false);
  });

  it('returns false when assignedAt is null', () => {
    const task = makeTask({ status: 'Assigned', assignedAt: null });
    expect(shouldAutoReassign(task, DEFAULT_CONFIG)).toBe(false);
  });
});

// ─── getExpiredAssignments ───────────────────────────────────────────────────

describe('getExpiredAssignments', () => {
  it('returns only tasks that should be auto-reassigned', () => {
    const tasks = [
      makeTask({
        id: 1,
        status: 'Assigned',
        assignedAt: new Date(Date.now() - 10 * 60000).toISOString(), // expired
      }),
      makeTask({
        id: 2,
        status: 'Assigned',
        assignedAt: new Date(Date.now() - 1 * 60000).toISOString(), // not expired
      }),
      makeTask({ id: 3, status: 'Active' }), // not assigned
    ];
    const expired = getExpiredAssignments(tasks, DEFAULT_CONFIG);
    expect(expired).toHaveLength(1);
    expect(expired[0].id).toBe(1);
  });

  it('returns empty array when nothing is expired', () => {
    const tasks = [makeTask({ status: 'Pending' }), makeTask({ status: 'Active' })];
    expect(getExpiredAssignments(tasks, DEFAULT_CONFIG)).toHaveLength(0);
  });
});
