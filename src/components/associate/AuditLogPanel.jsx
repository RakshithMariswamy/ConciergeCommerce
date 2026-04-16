/**
 * AuditLogPanel
 * ─────────────
 * Scrollable audit history showing every assignment lifecycle event.
 * Color-coded by severity: info / warn / error / success.
 */

import { useState } from 'react';
import { ClipboardList, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import useAssignmentStore from '../../store/useAssignmentStore';
import { formatAuditAction } from '../../services/auditLogger';

// ─── SEVERITY CONFIG ─────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  info: {
    dot: 'bg-blue-400',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    line: 'border-blue-200',
  },
  warn: {
    dot: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    line: 'border-amber-200',
  },
  error: {
    dot: 'bg-rose-400',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    line: 'border-rose-200',
  },
  success: {
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    line: 'border-emerald-200',
  },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const formatTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

// ─── LOG ENTRY ───────────────────────────────────────────────────────────────

const LogEntry = ({ entry, associates }) => {
  const cfg = SEVERITY_CONFIG[entry.severity] ?? SEVERITY_CONFIG.info;

  const actor = associates.find((a) => a.id === entry.actorId);
  const subject = associates.find((a) => a.id === entry.associateId);

  return (
    <div className={`relative pl-4 pb-3 border-l-2 ${cfg.line} last:pb-0`}>
      {/* Dot on timeline */}
      <div
        className={`absolute -left-[5px] top-1 w-2 h-2 rounded-full border-2 border-white ${cfg.dot}`}
      />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {/* Action label */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold ${cfg.badge}`}
            >
              {entry.label ?? formatAuditAction(entry.action)}
            </span>
            {entry.taskId != null && (
              <span className="text-[10px] text-gray-400 font-sans">
                Task #{entry.taskId}
              </span>
            )}
          </div>

          {/* Who did what */}
          <p className="text-xs text-gray-600 font-sans mt-0.5">
            <span className="font-medium text-charcoal">
              {actor?.name ?? entry.actorName}
            </span>
            {subject && subject.id !== entry.actorId && (
              <>
                {' '}→{' '}
                <span className="font-medium text-charcoal">{subject.name}</span>
              </>
            )}
          </p>

          {/* Reason */}
          {entry.reason && (
            <p className="text-[10px] text-gray-400 font-sans mt-0.5 italic">
              "{entry.reason}"
            </p>
          )}
        </div>

        {/* Timestamp */}
        <div className="shrink-0 text-right">
          <p className="text-[10px] text-gray-400 font-sans tabular-nums">
            {formatTime(entry.timestamp)}
          </p>
          <p className="text-[9px] text-gray-300 font-sans">
            {formatDate(entry.timestamp)}
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const AuditLogPanel = () => {
  const [expanded, setExpanded] = useState(false);
  const auditLog = useAssignmentStore((s) => s.auditLog);
  const clearAuditLog = useAssignmentStore((s) => s.clearAuditLog);
  const associates = useAssignmentStore((s) => s.associates);
  const canOverride = useAssignmentStore((s) => s.canOverride);

  const isLead = canOverride();
  const recent = auditLog.slice(0, expanded ? 50 : 5);

  return (
    <div className="bg-white rounded-2xl shadow-luxury border border-gray-100 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <ClipboardList size={16} className="text-gray-400" />
          <span className="font-serif text-base font-medium text-charcoal">Audit Log</span>
          {auditLog.length > 0 && (
            <span className="bg-gray-100 text-gray-600 text-[10px] font-sans font-bold px-2 py-0.5 rounded-full">
              {auditLog.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isLead && auditLog.length > 0 && expanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearAuditLog();
              }}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-sans text-gray-400 hover:text-rose-500 transition-colors rounded"
            >
              <Trash2 size={10} />
              Clear
            </button>
          )}
          {expanded ? (
            <ChevronUp size={15} className="text-gray-400" />
          ) : (
            <ChevronDown size={15} className="text-gray-400" />
          )}
        </div>
      </button>

      {/* Log entries */}
      {expanded && (
        <div className="px-5 pb-5">
          {auditLog.length === 0 ? (
            <p className="text-xs text-gray-300 font-sans italic text-center py-6">
              No events recorded yet.
            </p>
          ) : (
            <div className="space-y-0">
              {recent.map((entry) => (
                <LogEntry key={entry.id} entry={entry} associates={associates} />
              ))}
              {auditLog.length > 50 && (
                <p className="text-[10px] text-gray-400 font-sans text-center pt-2">
                  Showing 50 of {auditLog.length} entries
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Collapsed preview */}
      {!expanded && auditLog.length > 0 && (
        <div className="px-5 pb-4">
          <div className="space-y-0">
            {auditLog.slice(0, 3).map((entry) => (
              <LogEntry key={entry.id} entry={entry} associates={associates} />
            ))}
          </div>
          {auditLog.length > 3 && (
            <button
              onClick={() => setExpanded(true)}
              className="mt-2 text-[11px] text-gray-400 hover:text-charcoal font-sans transition-colors"
            >
              +{auditLog.length - 3} more events
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditLogPanel;
