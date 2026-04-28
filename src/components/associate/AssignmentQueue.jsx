/**
 * AssignmentQueue
 * ───────────────
 * Displays pending tasks sorted by priority score and provides:
 *  - "Run Auto-Assign" button (TeamLead+)
 *  - Per-task manual assignment controls (TeamLead+)
 *  - Visual priority ranking with score badge
 */

import { useState } from 'react';
import { Zap, AlertCircle, Clock, MapPin, User, ChevronDown, Layers } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import useAssignmentStore from '../../store/useAssignmentStore';
import {
  prioritizeTasks,
  calcTaskPriority,
  computeAssignments,
} from '../../services/taskAssignmentEngine';
import { createAuditEntry, AuditAction } from '../../services/auditLogger';
import { useAgent } from '../../hooks/useAgent';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const TYPE_DOT = {
  'Fitting Room': 'bg-purple-400',
  'Click & Collect': 'bg-blue-400',
  Assistance: 'bg-amber-400',
};

const timeAgo = (iso) => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff === 1) return '1 min ago';
  if (diff < 60) return `${diff} mins ago`;
  return `${Math.floor(diff / 60)}h ${diff % 60}m ago`;
};

const priorityLabel = (score) => {
  if (score >= 14) return { label: 'Critical', color: 'text-rose-600 bg-rose-50 border-rose-200' };
  if (score >= 10) return { label: 'High', color: 'text-orange-600 bg-orange-50 border-orange-200' };
  if (score >= 5) return { label: 'Normal', color: 'text-blue-600 bg-blue-50 border-blue-200' };
  return { label: 'Low', color: 'text-gray-500 bg-gray-50 border-gray-200' };
};

// ─── TASK ROW ─────────────────────────────────────────────────────────────────

const QueueTaskRow = ({ task, rank, associates, onAssign, isLead }) => {
  const [open, setOpen] = useState(false);
  const score = calcTaskPriority(task);
  const pCfg = priorityLabel(score);
  const dot = TYPE_DOT[task.type] ?? 'bg-gray-400';
  const available = associates.filter((a) => a.attendanceStatus === 'on-floor');

  return (
    <div className="bg-white rounded-xl shadow-luxury border border-gray-100 overflow-hidden">
      {/* Priority indicator bar */}
      <div
        className={`h-0.5 ${
          score >= 14
            ? 'bg-rose-400'
            : score >= 10
            ? 'bg-orange-400'
            : score >= 5
            ? 'bg-blue-400'
            : 'bg-gray-200'
        }`}
      />

      <div className="p-3.5">
        {/* Row header */}
        <div className="flex items-start gap-3">
          {/* Rank badge */}
          <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
            {rank}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-gray-500">
                {task.type}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold ${pCfg.color}`}
              >
                <AlertCircle size={9} />
                {pCfg.label}
              </span>
              {task.customerTier === 'Platinum' && (
                <span className="px-1.5 py-0.5 rounded border text-[10px] font-bold bg-amber-50 text-amber-700 border-amber-200">
                  VIP
                </span>
              )}
            </div>

            <p className="font-serif text-base font-medium text-charcoal truncate">
              {task.customer}
            </p>
            <p className="text-xs text-gray-400 font-sans truncate">{task.item}</p>

            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {task.location && (
                <span className="flex items-center gap-1 text-[10px] text-gray-400 font-sans">
                  <MapPin size={9} />
                  {task.location}
                </span>
              )}
              <span className="flex items-center gap-1 text-[10px] text-gray-400 font-sans">
                <Clock size={9} />
                {timeAgo(task.receivedAt)}
              </span>
              {task.autoReassignCount > 0 && (
                <span className="text-[10px] text-amber-600 font-semibold font-sans">
                  ↺ Retried ×{task.autoReassignCount}
                </span>
              )}
            </div>
          </div>

          {/* Assign control (TeamLead only) */}
          {isLead && (
            <button
              onClick={() => setOpen((p) => !p)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-sans font-semibold rounded-lg bg-charcoal text-white hover:bg-gray-800 active:scale-95 transition-all shrink-0"
            >
              <User size={11} />
              Assign
              <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* Assignee dropdown */}
        {isLead && open && (
          <div className="mt-2.5 border-t border-gray-100 pt-2.5">
            {available.length === 0 ? (
              <p className="text-xs text-gray-400 font-sans italic">
                No associates available — task will remain queued.
              </p>
            ) : (
              <div className="space-y-1">
                {available.map((assoc) => (
                  <button
                    key={assoc.id}
                    onClick={() => {
                      onAssign(task.id, assoc.id);
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-sans hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-charcoal text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                      {assoc.initials}
                    </div>
                    <span className="font-medium text-charcoal">{assoc.name}</span>
                    <span className="text-gray-400 ml-auto">{assoc.department}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const AssignmentQueue = () => {
  const tasks = useAppStore((s) => s.tasks);
  const assignTaskToAssociate = useAppStore((s) => s.assignTaskToAssociate);
  const associates = useAssignmentStore((s) => s.associates);
  const config = useAssignmentStore((s) => s.config);
  const canOverride = useAssignmentStore((s) => s.canOverride);
  const addAuditEntry = useAssignmentStore((s) => s.addAuditEntry);
  const markAssociateAssigned = useAssignmentStore((s) => s.markAssociateAssigned);
  const acquireLock = useAssignmentStore((s) => s.acquireLock);
  const releaseLock = useAssignmentStore((s) => s.releaseLock);
  const currentUser = useAssignmentStore((s) => s.currentUser);
  const auditLog = useAssignmentStore((s) => s.auditLog);
  const { invokeRouted, isThinking } = useAgent('orchestrator');

  const isLead = canOverride();
  const prioritized = prioritizeTasks(tasks);

  // ── Manual single-task assignment ──
  const handleManualAssign = (taskId, associateId) => {
    const lockResult = acquireLock(taskId, currentUser.id);
    if (!lockResult.success) {
      alert(`Task is being modified by another lead (${lockResult.lockedBy}). Please try again.`);
      return;
    }

    const assoc = associates.find((a) => a.id === associateId);
    assignTaskToAssociate(taskId, associateId, assoc?.name ?? '');
    markAssociateAssigned(associateId);
    addAuditEntry(
      createAuditEntry({
        action: AuditAction.ASSIGNED,
        taskId,
        associateId,
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        reason: 'Manual assignment by lead',
      })
    );

    releaseLock(taskId);
  };

  // ── Auto-assign all pending tasks ──
  const handleAutoAssign = () => {
    const { assignments, elapsedMs } = computeAssignments(tasks, associates, config);

    if (assignments.length === 0) {
      return;
    }

    assignments.forEach(({ taskId, associateId }) => {
      const lockResult = acquireLock(taskId, 'system');
      if (!lockResult.success) return; // Skip locked tasks

      const assoc = associates.find((a) => a.id === associateId);
      assignTaskToAssociate(taskId, associateId, assoc?.name ?? '');
      markAssociateAssigned(associateId);
      addAuditEntry(
        createAuditEntry({
          action: AuditAction.ASSIGNED,
          taskId,
          associateId,
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          reason: 'Auto-assignment run by lead',
          metadata: { elapsedMs: elapsedMs.toFixed(1) },
        })
      );

      releaseLock(taskId);

      // AI enrichment runs asynchronously after the deterministic assignment.
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      void invokeRouted({
        intent: `Determine best associate assignment for task ${task.id} with fairness and priority context.`,
        context: {
          source: 'assignment-queue',
          taskId: task.id,
          pendingCount: prioritized.length,
        },
        payloadByAgent: {
          task_assignment: {
            task,
            associates,
            tasks,
            auditLog,
          },
        },
        defaultPayload: {
          task,
          associates,
          tasks,
          auditLog,
        },
      })
        .then((routed) => {
          const aiDecision = routed?.result;
          if (!aiDecision?.reasoning) return;

          addAuditEntry(
            createAuditEntry({
              action: AuditAction.AI_ASSIGNED,
              taskId,
              associateId: aiDecision.assigneeId || associateId,
              actorId: currentUser.id,
              actorName: currentUser.name,
              actorRole: currentUser.role,
              reason: aiDecision.reasoning,
              metadata: {
                confidence: aiDecision.confidence ?? null,
                algorithmAssigneeId: associateId,
                routedAgent: routed?.route?.agent || null,
              },
            })
          );
        })
        .catch(() => {});
    });

    addAuditEntry(
      createAuditEntry({
        action: AuditAction.AUTO_ASSIGN_RUN,
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        metadata: {
          assignedCount: assignments.length,
          elapsedMs: elapsedMs.toFixed(1),
        },
      })
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-serif text-lg font-medium text-charcoal">Assignment Queue</h2>
          <p className="text-[11px] text-gray-400 font-sans mt-0.5">
            {prioritized.length} pending · sorted by priority
          </p>
        </div>
        {isLead && prioritized.length > 0 && (
          <button
            onClick={handleAutoAssign}
            className="flex items-center gap-2 px-4 py-2 bg-charcoal text-white text-xs font-sans font-semibold rounded-xl hover:bg-gray-800 active:scale-95 transition-all shadow-luxury"
          >
            <Zap size={13} />
            {isThinking ? 'AI Enriching...' : 'Auto-Assign All'}
          </button>
        )}
      </div>

      {/* Queue */}
      {prioritized.length === 0 ? (
        <div className="text-center py-16 text-gray-300">
          <Layers size={36} strokeWidth={1} className="mx-auto mb-3 opacity-40" />
          <p className="font-sans text-sm">Queue is clear</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {prioritized.map((task, i) => (
            <QueueTaskRow
              key={task.id}
              task={task}
              rank={i + 1}
              associates={associates}
              onAssign={handleManualAssign}
              isLead={isLead}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AssignmentQueue;
