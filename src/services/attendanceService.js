/**
 * AttendanceService
 * ─────────────────
 * Abstracts the external attendance data source.
 * Supports:
 *   - Polling (via poll / fetch)
 *   - Webhook-style event emission
 *   - Graceful degradation: if the service is unreachable,
 *     returns { data: lastKnownState, degraded: true }
 *
 * In production replace the simulated fetch with a real API call.
 */

import { mockAssociates } from '../data/mockData';

// ─── INTERNAL STATE ──────────────────────────────────────────────────────────

let _lastKnownState = null;
let _isHealthy = true;
// Controls simulated failure probability (0–1). Raise in dev to test degraded mode.
const SIMULATED_FAILURE_RATE = 0.08;

// ─── PRIVATE HELPERS ─────────────────────────────────────────────────────────

/**
 * Simulates an async HTTP fetch to an attendance API.
 * Replace with: return fetch('/api/v1/attendance').then(r => r.json())
 */
const _fetchFromSource = async () => {
  await new Promise((r) => setTimeout(r, 80)); // Simulate network latency

  if (Math.random() < SIMULATED_FAILURE_RATE) {
    throw new Error('AttendanceService: Network timeout (simulated)');
  }

  // Return a fresh copy so callers cannot mutate the source
  return mockAssociates.map((a) => ({ ...a }));
};

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

export const AttendanceService = {
  /**
   * Fetches the current attendance roster.
   *
   * On success:  { data: Associate[], degraded: false }
   * On failure:  { data: Associate[] | null, degraded: true, error: string }
   *
   * Falls back to the last known snapshot when the source is unavailable,
   * matching the "Inconsistent State" edge-case requirement.
   */
  async fetch() {
    try {
      const data = await _fetchFromSource();
      _lastKnownState = data;
      _isHealthy = true;
      return { data, degraded: false };
    } catch (err) {
      _isHealthy = false;
      console.warn(
        '[AttendanceService] Fetch failed — falling back to last known state.',
        err.message
      );
      return {
        data: _lastKnownState,
        degraded: true,
        error: err.message,
      };
    }
  },

  /**
   * Returns the most recently fetched snapshot without a network round-trip.
   * Useful for synchronous reads (e.g. during clock-out handling).
   */
  getLastKnownState() {
    return _lastKnownState;
  },

  /** True if the last fetch succeeded. */
  isHealthy() {
    return _isHealthy;
  },

  // ─── WEBHOOK EVENT SIMULATION ──────────────────────────────────────────────
  // In production these would be inbound webhook payloads from your HR system.

  /** Emits a clock-in event object (pass to your event bus / webhook handler). */
  emitClockIn(associateId) {
    return {
      event: 'attendance.clock-in',
      associateId,
      timestamp: new Date().toISOString(),
    };
  },

  /** Emits a clock-out event object. */
  emitClockOut(associateId) {
    return {
      event: 'attendance.clock-out',
      associateId,
      timestamp: new Date().toISOString(),
    };
  },

  /** Emits a break-start event object. */
  emitBreakStart(associateId) {
    return {
      event: 'attendance.break-start',
      associateId,
      timestamp: new Date().toISOString(),
    };
  },

  /** Emits a break-end event object. */
  emitBreakEnd(associateId) {
    return {
      event: 'attendance.break-end',
      associateId,
      timestamp: new Date().toISOString(),
    };
  },
};
