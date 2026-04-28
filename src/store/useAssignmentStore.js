/**
 * useAssignmentStore
 * ──────────────────
 * Zustand store for the Dynamic Task Assignment Module.
 * Manages: associates, assignment config, pessimistic locks, audit log,
 * attendance service health, and the current logged-in user.
 *
 * Task data itself lives in useAppStore — this store holds the
 * assignment-layer concerns only (Clean Architecture bounded context).
 */

import { create } from 'zustand';
import { mockAssociates } from '../data/mockData';
import { createAuditEntry, AuditAction } from '../services/auditLogger';

// ─── DEFAULT CONFIG ───────────────────────────────────────────────────────────

export const DEFAULT_CONFIG = {
  /** Max active tasks per associate (N) */
  maxTasksPerAssociate: 3,
  /** Minutes before an unaccepted Assigned task is returned to pool (X) */
  autoReassignMinutes: 5,
  /** Attendance poll interval in ms */
  pollIntervalMs: 30000,
};

// ─── VALID SETS ───────────────────────────────────────────────────────────────

const VALID_ATTENDANCE_STATUSES = new Set(['on-floor', 'on-break', 'clocked-out']);

// ─── STORE ───────────────────────────────────────────────────────────────────

const useAssignmentStore = create((set, get) => ({
  // ─── ASSOCIATES ─────────────────────────────────────────────────────────────
  associates: mockAssociates,

  // ─── CONFIG ─────────────────────────────────────────────────────────────────
  config: { ...DEFAULT_CONFIG },

  updateConfig: (key, value) => {
    const { currentUser, addAuditEntry } = get();
    set((state) => ({ config: { ...state.config, [key]: value } }));
    addAuditEntry(
      createAuditEntry({
        action: AuditAction.CONFIG_CHANGED,
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        reason: `${key} set to ${value}`,
        metadata: { key, value },
      })
    );
  },

  // ─── PESSIMISTIC LOCKS ───────────────────────────────────────────────────────
  // Prevents race conditions when two leads attempt to assign the same task.
  // Shape: { [taskId]: { lockedBy: actorId, lockedAt: isoString } }
  locks: {},

  /**
   * Attempts to acquire a lock on a task.
   * Returns { success: true } or { success: false, lockedBy: actorId }.
   */
  acquireLock: (taskId, actorId) => {
    const { locks } = get();
    const existing = locks[taskId];
    if (existing && existing.lockedBy !== actorId) {
      return { success: false, lockedBy: existing.lockedBy };
    }
    set((state) => ({
      locks: {
        ...state.locks,
        [taskId]: { lockedBy: actorId, lockedAt: new Date().toISOString() },
      },
    }));
    return { success: true };
  },

  releaseLock: (taskId) =>
    set((state) => {
      const { [taskId]: _removed, ...rest } = state.locks;
      return { locks: rest };
    }),

  // ─── AUDIT LOG ───────────────────────────────────────────────────────────────
  auditLog: [],

  // ─── AGENT STATE ─────────────────────────────────────────────────────────────
  agentState: {
    isThinking: false,
    lastAgentAction: null,
    agentAuditEntries: [],
    // Routing observability — last 20 orchestrator decisions with timing
    routingHistory: [],
    lastError: null,
  },

  setAgentThinking: (val) =>
    set((state) => ({
      agentState: {
        ...state.agentState,
        isThinking: Boolean(val),
        // Clear error when a new invocation starts
        lastError: val ? null : state.agentState.lastError,
      },
    })),

  recordAgentAction: (action) =>
    set((state) => ({
      agentState: {
        ...state.agentState,
        lastAgentAction: action,
        agentAuditEntries: [...state.agentState.agentAuditEntries, action],
      },
    })),

  /**
   * Records a completed orchestrator routing decision with timing.
   * Shape: { id, source, intent, routedAgent, routeReason, routeMs, execMs,
   *          totalMs, mode, error, timestamp }
   * Capped at 20 entries (newest first).
   */
  recordRoutingDecision: (decision) =>
    set((state) => ({
      agentState: {
        ...state.agentState,
        lastError: decision.error || null,
        routingHistory: [decision, ...state.agentState.routingHistory].slice(0, 20),
      },
    })),

  /** Prepend an entry and cap the log at 500 entries. */
  addAuditEntry: (entry) =>
    set((state) => ({
      auditLog: [entry, ...state.auditLog].slice(0, 500),
    })),

  clearAuditLog: () => set({ auditLog: [] }),

  // ─── ATTENDANCE SERVICE STATUS ────────────────────────────────────────────────
  /** 'healthy' | 'degraded' */
  attendanceStatus: 'healthy',

  setAttendanceStatus: (status) => set({ attendanceStatus: status }),

  // ─── CURRENT USER ────────────────────────────────────────────────────────────
  // Simulated — in production this comes from your auth context / JWT claims.
  // Pre-set to TeamLead so the full UI is unlocked for demo purposes.
  currentUser: {
    id: 'assoc-003',
    name: 'Derek Wilson',
    role: 'TeamLead', // 'Associate' | 'TeamLead' | 'Manager'
  },

  setCurrentUser: (user) => set({ currentUser: user }),

  // ─── RBAC HELPER ─────────────────────────────────────────────────────────────
  /** Returns true if the current user can perform lead-level overrides. */
  canOverride: () => {
    const { currentUser } = get();
    return currentUser.role === 'TeamLead' || currentUser.role === 'Manager';
  },

  // ─── ATTENDANCE SYNC ─────────────────────────────────────────────────────────
  /**
   * Merges fresh attendance data from the AttendanceService into the local
   * associate list. Preserves any local-only fields not in the payload.
   */
  syncAttendance: (attendanceData) => {
    if (!attendanceData) return;
    set((state) => ({
      associates: state.associates.map((assoc) => {
        const fresh = attendanceData.find((a) => a.id === assoc.id);
        return fresh ? { ...assoc, ...fresh } : assoc;
      }),
    }));
  },

  // ─── ATTENDANCE MUTATIONS ─────────────────────────────────────────────────────
  _updateAssociateAttendance: (associateId, newStatus, extraFields = {}) => {
    if (!VALID_ATTENDANCE_STATUSES.has(newStatus)) return;

    set((state) => ({
      associates: state.associates.map((a) =>
        a.id === associateId
          ? { ...a, attendanceStatus: newStatus, ...extraFields }
          : a
      ),
    }));

    const { currentUser, addAuditEntry } = get();
    const actionMap = {
      'on-floor': AuditAction.CLOCKED_IN,
      'on-break': AuditAction.ON_BREAK,
      'clocked-out': AuditAction.CLOCKED_OUT,
    };

    addAuditEntry(
      createAuditEntry({
        action: actionMap[newStatus],
        associateId,
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
      })
    );
  },

  clockInAssociate: (associateId) =>
    get()._updateAssociateAttendance(associateId, 'on-floor', {
      clockedInAt: new Date().toISOString(),
      breakStartedAt: null,
    }),

  clockOutAssociate: (associateId) =>
    get()._updateAssociateAttendance(associateId, 'clocked-out', {
      clockedInAt: null,
      breakStartedAt: null,
    }),

  setAssociateOnBreak: (associateId) =>
    get()._updateAssociateAttendance(associateId, 'on-break', {
      breakStartedAt: new Date().toISOString(),
    }),

  returnFromBreak: (associateId) =>
    get()._updateAssociateAttendance(associateId, 'on-floor', {
      breakStartedAt: null,
    }),

  /** Updates the lastAssignedAt timestamp after a successful assignment. */
  markAssociateAssigned: (associateId) =>
    set((state) => ({
      associates: state.associates.map((a) =>
        a.id === associateId
          ? { ...a, lastAssignedAt: new Date().toISOString() }
          : a
      ),
    })),
}));

export default useAssignmentStore;
