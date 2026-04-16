/**
 * Integration Tests — Assignment Algorithm
 * ─────────────────────────────────────────
 * Tests the full assignment pipeline end-to-end:
 * Engine → Store interactions → Edge cases.
 */

import { describe, it, expect } from 'vitest';
import { computeAssignments, getExpiredAssignments } from '../services/taskAssignmentEngine';
import { createAuditEntry, AuditAction, getAuditSeverity } from '../services/auditLogger';

// ─── FIXTURES ────────────────────────────────────────────────────────────────

const cfg = { maxTasksPerAssociate: 3, autoReassignMinutes: 5 };

const makeAssociate = (id, status = 'on-floor', lastAssignedAt = null) => ({
  id,
  name: `Associate ${id}`,
  initials: id.slice(-2).toUpperCase(),
  attendanceStatus: status,
  lastAssignedAt,
});

const makeTask = (id, overrides = {}) => ({
  id,
  type: 'Assistance',
  customer: 'Test',
  customerId: null,
  customerTier: null,
  urgency: 'normal',
  status: 'Pending',
  assigneeId: null,
  assignedAt: null,
  autoReassignCount: 0,
  receivedAt: new Date().toISOString(),
  ...overrides,
});

// ─── INTEGRATION: FULL ASSIGNMENT PIPELINE ───────────────────────────────────

describe('Full assignment pipeline', () => {
  it('assigns VIP (Platinum) tasks before standard tasks when capacity is limited', () => {
    const associates = [makeAssociate('a1')]; // One slot (maxTasks=1)
    const tasks = [
      makeTask(1, { customerTier: 'Silver', urgency: 'normal' }),
      makeTask(2, { customerTier: 'Platinum', urgency: 'normal' }),
      makeTask(3, { customerTier: null, urgency: 'normal' }),
    ];
    const { assignments } = computeAssignments(tasks, associates, {
      ...cfg,
      maxTasksPerAssociate: 1,
    });
    expect(assignments[0].taskId).toBe(2); // Platinum first
  });

  it('assigns urgent tasks before VIP when urgency is high', () => {
    const associates = [makeAssociate('a1')];
    const tasks = [
      makeTask(1, { customerTier: 'Platinum', urgency: 'normal' }),
      makeTask(2, { customerTier: null, urgency: 'high' }),
    ];
    const { assignments } = computeAssignments(tasks, associates, {
      ...cfg,
      maxTasksPerAssociate: 1,
    });
    // High urgency (10) > Platinum normal (5+4=9)
    expect(assignments[0].taskId).toBe(2);
  });

  it('handles Zero Availability: queues tasks when all associates are at max', () => {
    const associates = [makeAssociate('a1')];
    const existingTasks = [
      makeTask(0, { assigneeId: 'a1', status: 'Active' }),
      makeTask(1, { assigneeId: 'a1', status: 'Active' }),
      makeTask(2, { assigneeId: 'a1', status: 'Assigned' }),
    ];
    const newTask = makeTask(99, { status: 'Pending' });
    const { assignments } = computeAssignments(
      [...existingTasks, newTask],
      associates,
      cfg
    );
    // a1 is at max capacity — no assignment possible
    expect(assignments).toHaveLength(0);
  });

  it('handles Zero Availability when all associates are clocked out', () => {
    const associates = [
      makeAssociate('a1', 'clocked-out'),
      makeAssociate('a2', 'on-break'),
    ];
    const tasks = [makeTask(1), makeTask(2), makeTask(3)];
    const { assignments } = computeAssignments(tasks, associates, cfg);
    expect(assignments).toHaveLength(0);
  });

  it('does not reassign already-assigned tasks', () => {
    const associates = [makeAssociate('a1'), makeAssociate('a2')];
    const tasks = [
      makeTask(1, { status: 'Assigned', assigneeId: 'a1' }),
      makeTask(2, { status: 'Pending' }),
    ];
    const { assignments } = computeAssignments(tasks, associates, cfg);
    expect(assignments).toHaveLength(1);
    expect(assignments[0].taskId).toBe(2);
  });
});

// ─── INTEGRATION: AUTO-REASSIGNMENT CYCLE ────────────────────────────────────

describe('Auto-reassignment edge cases', () => {
  it('identifies multiple expired assignments simultaneously', () => {
    const expired = new Date(Date.now() - 10 * 60000).toISOString();
    const fresh = new Date(Date.now() - 1 * 60000).toISOString();
    const tasks = [
      makeTask(1, { status: 'Assigned', assignedAt: expired }),
      makeTask(2, { status: 'Assigned', assignedAt: expired }),
      makeTask(3, { status: 'Assigned', assignedAt: fresh }),
      makeTask(4, { status: 'Active' }),
    ];
    const expired2 = getExpiredAssignments(tasks, cfg);
    expect(expired2).toHaveLength(2);
    expect(expired2.map((t) => t.id).sort()).toEqual([1, 2]);
  });

  it('re-assigns expired tasks to an available associate after returning to pool', () => {
    // Simulate: task was assigned, expired, returned to Pending, then re-assigned.
    // null lastAssignedAt (epoch 0) sorts before any real timestamp → picked first.
    const associates = [
      makeAssociate('a1', 'on-floor', null),
      makeAssociate('a2', 'on-floor', new Date(Date.now() - 30000).toISOString()),
    ];
    const tasksAfterReturn = [
      makeTask(1, { status: 'Pending', autoReassignCount: 1 }),
    ];
    const { assignments } = computeAssignments(tasksAfterReturn, associates, cfg);
    expect(assignments).toHaveLength(1);
    expect(['a1', 'a2']).toContain(assignments[0].associateId);
  });
});

// ─── INTEGRATION: SIMULTANEOUS CLOCK-OUT SCENARIO ────────────────────────────

describe('Simultaneous clock-out edge case', () => {
  it('clocked-out associates are immediately excluded from new assignments', () => {
    const associates = [
      makeAssociate('a1', 'clocked-out'), // Just clocked out
      makeAssociate('a2', 'on-floor'),
    ];
    const tasks = [makeTask(1), makeTask(2)];
    const { assignments } = computeAssignments(tasks, associates, cfg);
    // All assignments should go to a2 only
    assignments.forEach(({ associateId }) => {
      expect(associateId).toBe('a2');
    });
  });
});

// ─── INTEGRATION: FAIR DISTRIBUTION ─────────────────────────────────────────

describe('Fair workload distribution', () => {
  it('distributes tasks evenly across available associates', () => {
    const associates = Array.from({ length: 3 }, (_, i) => makeAssociate(`a${i}`));
    const tasks = Array.from({ length: 6 }, (_, i) => makeTask(i));
    const { assignments } = computeAssignments(tasks, associates, cfg);

    expect(assignments).toHaveLength(6);

    const workloads = { a0: 0, a1: 0, a2: 0 };
    assignments.forEach(({ associateId }) => {
      workloads[associateId]++;
    });

    // Each associate should get exactly 2 tasks (6 / 3 = 2)
    Object.values(workloads).forEach((count) => {
      expect(count).toBe(2);
    });
  });

  it('respects the maxTasksPerAssociate cap', () => {
    const config = { ...cfg, maxTasksPerAssociate: 2 };
    const associates = [makeAssociate('a1')];
    const tasks = Array.from({ length: 5 }, (_, i) => makeTask(i));
    const { assignments } = computeAssignments(tasks, associates, config);
    expect(assignments).toHaveLength(2); // Cap at maxTasksPerAssociate
  });
});

// ─── INTEGRATION: AUDIT LOGGER ───────────────────────────────────────────────

describe('AuditLogger', () => {
  it('creates immutable audit entries', () => {
    const entry = createAuditEntry({
      action: AuditAction.ASSIGNED,
      taskId: 1,
      associateId: 'a1',
      actorId: 'lead-1',
      actorName: 'Team Lead',
      actorRole: 'TeamLead',
      reason: 'Manual assignment',
    });

    expect(entry.action).toBe(AuditAction.ASSIGNED);
    expect(entry.taskId).toBe(1);
    expect(entry.reason).toBe('Manual assignment');
    expect(entry.id).toBeDefined();
    expect(entry.timestamp).toBeDefined();

    // Should be frozen
    expect(() => {
      entry.action = 'MUTATED';
    }).toThrow();
  });

  it('assigns correct severity to each action type', () => {
    expect(getAuditSeverity(AuditAction.TASK_COMPLETED)).toBe('success');
    expect(getAuditSeverity(AuditAction.TASK_FLAGGED)).toBe('error');
    expect(getAuditSeverity(AuditAction.REASSIGNED)).toBe('warn');
    expect(getAuditSeverity(AuditAction.ASSIGNED)).toBe('info');
  });

  it('sets null defaults for optional fields', () => {
    const entry = createAuditEntry({
      action: AuditAction.AUTO_ASSIGN_RUN,
      actorId: 'system',
      actorName: 'System',
      actorRole: 'System',
    });
    expect(entry.taskId).toBeNull();
    expect(entry.associateId).toBeNull();
    expect(entry.reason).toBeNull();
  });

  it('includes all required fields', () => {
    const entry = createAuditEntry({
      action: AuditAction.CLOCKED_OUT,
      associateId: 'a1',
      actorId: 'lead-1',
      actorName: 'Test Lead',
      actorRole: 'TeamLead',
    });
    expect(entry).toMatchObject({
      id: expect.stringContaining('audit-'),
      timestamp: expect.any(String),
      action: AuditAction.CLOCKED_OUT,
      label: expect.any(String),
      severity: expect.any(String),
    });
  });
});

// ─── INTEGRATION: CONFIGURABLE THRESHOLDS ────────────────────────────────────

describe('Configurable thresholds', () => {
  it('respects custom autoReassignMinutes', () => {
    const customCfg = { ...cfg, autoReassignMinutes: 2 };
    const task = makeTask(1, {
      status: 'Assigned',
      assignedAt: new Date(Date.now() - 3 * 60000).toISOString(), // 3 mins (> 2 min threshold)
    });
    expect(getExpiredAssignments([task], customCfg)).toHaveLength(1);
  });

  it('respects custom maxTasksPerAssociate', () => {
    const customCfg = { ...cfg, maxTasksPerAssociate: 1 };
    const associates = [makeAssociate('a1')];
    const tasks = [makeTask(1), makeTask(2)];
    const { assignments } = computeAssignments(tasks, associates, customCfg);
    expect(assignments).toHaveLength(1); // Only 1 allowed
  });
});
