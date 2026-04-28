/**
 * LeadOverridePanel
 * ─────────────────
 * Modal panel for TeamLead overrides:
 *   - Reassign an active/assigned task to a different associate
 *   - Revoke (unassign) a task back to the pool
 *   - Flag a task for escalation
 *
 * RBAC: Caller must check canOverride() before rendering.
 * Locking: Acquires a pessimistic lock before any mutation and
 * releases it on close — satisfying the Race Condition edge case.
 */

import { useState } from 'react';
import { X, RotateCcw, Flag, AlertTriangle, User } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import useAssignmentStore from '../../store/useAssignmentStore';
import { createAuditEntry, AuditAction } from '../../services/auditLogger';

// ─── MODAL WRAPPER ───────────────────────────────────────────────────────────

const Modal = ({ onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
    <div
      className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden">
      {children}
    </div>
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

/**
 * @param {object}   props
 * @param {object}   props.task      - The task to override
 * @param {function} props.onClose   - Called when the panel is dismissed
 */
const LeadOverridePanel = ({ task, onClose }) => {
  const [selectedAssociate, setSelectedAssociate] = useState('');
  const [reason, setReason] = useState('');
  const [action, setAction] = useState('reassign'); // 'reassign' | 'revoke' | 'flag'
  const [lockError, setLockError] = useState(null);

  const { reassignTask, unassignTask, flagTask, unflagTask } = useAppStore();
  const {
    associates,
    acquireLock,
    releaseLock,
    addAuditEntry,
    markAssociateAssigned,
    currentUser,
  } = useAssignmentStore.getState();

  const onFloor = associates.filter(
    (a) => a.attendanceStatus === 'on-floor' && a.id !== task.assigneeId
  );

  const currentAssignee = associates.find((a) => a.id === task.assigneeId);

  const handleSubmit = () => {
    if (action === 'reassign' && !selectedAssociate) return;
    if (!reason.trim()) return;

    // Acquire pessimistic lock — guards against simultaneous lead edits
    const lock = acquireLock(task.id, currentUser.id);
    if (!lock.success) {
      setLockError(`Task is currently being modified by ${lock.lockedBy}. Try again shortly.`);
      return;
    }

    try {
      if (action === 'reassign') {
        const newAssignee = associates.find((a) => a.id === selectedAssociate);
        reassignTask(task.id, selectedAssociate, newAssignee?.name ?? '');
        markAssociateAssigned(selectedAssociate);
        addAuditEntry(
          createAuditEntry({
            action: AuditAction.REASSIGNED,
            taskId: task.id,
            associateId: selectedAssociate,
            actorId: currentUser.id,
            actorName: currentUser.name,
            actorRole: currentUser.role,
            reason,
            metadata: { previousAssignee: task.assigneeId },
          })
        );
      } else if (action === 'revoke') {
        unassignTask(task.id);
        addAuditEntry(
          createAuditEntry({
            action: AuditAction.UNASSIGNED,
            taskId: task.id,
            associateId: task.assigneeId,
            actorId: currentUser.id,
            actorName: currentUser.name,
            actorRole: currentUser.role,
            reason,
          })
        );
      } else if (action === 'flag') {
        if (task.status === 'Flagged') {
          unflagTask(task.id);
          addAuditEntry(
            createAuditEntry({
              action: AuditAction.TASK_UNFLAGGED,
              taskId: task.id,
              actorId: currentUser.id,
              actorName: currentUser.name,
              actorRole: currentUser.role,
              reason,
            })
          );
        } else {
          flagTask(task.id);
          addAuditEntry(
            createAuditEntry({
              action: AuditAction.TASK_FLAGGED,
              taskId: task.id,
              associateId: task.assigneeId,
              actorId: currentUser.id,
              actorName: currentUser.name,
              actorRole: currentUser.role,
              reason,
            })
          );
        }
      }

      onClose();
    } finally {
      releaseLock(task.id);
    }
  };

  const canSubmit =
    reason.trim().length > 0 && (action !== 'reassign' || selectedAssociate);

  return (
    <Modal onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h2 className="font-serif text-lg font-medium text-slate-900">Lead Override</h2>
          <p className="text-xs text-gray-400 font-sans mt-0.5 truncate max-w-xs">
            {task.customer} — {task.type}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X size={16} className="text-gray-500" />
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Lock error */}
        {lockError && (
          <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-sans">
            <AlertTriangle size={13} />
            {lockError}
          </div>
        )}

        {/* Current assignee info */}
        {currentAssignee && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100 text-sm font-sans">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
              {currentAssignee.initials}
            </div>
            <div>
              <p className="font-medium text-slate-900 leading-tight">{currentAssignee.name}</p>
              <p className="text-[10px] text-gray-400">Current assignee · {currentAssignee.department}</p>
            </div>
          </div>
        )}

        {/* Action selector */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'reassign', icon: RotateCcw, label: 'Reassign' },
            { id: 'revoke', icon: User, label: 'Return to Pool' },
            {
              id: 'flag',
              icon: Flag,
              label: task.status === 'Flagged' ? 'Unflag' : 'Flag',
            },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setAction(id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-sans font-semibold transition-all ${
                action === id
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-600'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Assignee picker */}
        {action === 'reassign' && (
          <div>
            <label className="block text-[11px] font-sans font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Assign to
            </label>
            <select
              value={selectedAssociate}
              onChange={(e) => setSelectedAssociate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-sans text-slate-900 bg-white focus:outline-none focus:border-indigo-600 transition-colors"
            >
              <option value="">Select associate…</option>
              {onFloor.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.department})
                </option>
              ))}
            </select>
            {onFloor.length === 0 && (
              <p className="text-[11px] text-amber-600 font-sans mt-1">
                No other associates available on the floor.
              </p>
            )}
          </div>
        )}

        {/* Reason field (required for audit log) */}
        <div>
          <label className="block text-[11px] font-sans font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Reason <span className="text-rose-400">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Briefly describe why this change is needed…"
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-sans text-slate-900 placeholder-gray-300 focus:outline-none focus:border-indigo-600 resize-none transition-colors"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-3 px-5 pb-5">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-sans text-gray-500 hover:border-indigo-600 hover:text-indigo-600 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-sans font-semibold hover:from-indigo-700 hover:to-purple-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Confirm Override
        </button>
      </div>
    </Modal>
  );
};

export default LeadOverridePanel;
