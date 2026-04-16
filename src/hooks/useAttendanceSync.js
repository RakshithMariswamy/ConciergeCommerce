/**
 * useAttendanceSync
 * ─────────────────
 * Polls the AttendanceService on a configurable interval and keeps the
 * assignment store's associate pool in sync.
 *
 * On failure the service returns the last known snapshot; this hook
 * updates the store's attendanceStatus to 'degraded' so the UI can
 * surface a warning banner — satisfying the "Inconsistent State" edge case.
 */

import { useEffect, useRef } from 'react';
import { AttendanceService } from '../services/attendanceService';
import useAssignmentStore from '../store/useAssignmentStore';

export const useAttendanceSync = () => {
  const config = useAssignmentStore((s) => s.config);
  const syncAttendance = useAssignmentStore((s) => s.syncAttendance);
  const setAttendanceStatus = useAssignmentStore((s) => s.setAttendanceStatus);
  const started = useRef(false);

  useEffect(() => {
    // Guard against React StrictMode double-invocation
    if (started.current) return;
    started.current = true;

    let isMounted = true;

    const poll = async () => {
      const { data, degraded } = await AttendanceService.fetch();
      if (!isMounted) return;

      setAttendanceStatus(degraded ? 'degraded' : 'healthy');
      if (data) syncAttendance(data);
    };

    // Immediate first fetch, then poll on interval
    poll();
    const intervalId = setInterval(poll, config.pollIntervalMs);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
};
