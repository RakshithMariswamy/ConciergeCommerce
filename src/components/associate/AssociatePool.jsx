/**
 * AssociatePool
 * ─────────────
 * Displays the live on-floor associate roster with:
 *  - Attendance status (on-floor / on-break / clocked-out)
 *  - Active workload bar
 *  - Attendance controls (clock in/out, break toggle)
 *
 * TeamLead-only controls are gated by the canOverride() RBAC check.
 */

import { Coffee, LogIn, LogOut, RotateCcw } from 'lucide-react';
import useAssignmentStore from '../../store/useAssignmentStore';
import useAppStore from '../../store/useAppStore';

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────

const ATTENDANCE_CONFIG = {
  'on-floor': {
    dot: 'bg-emerald-400',
    label: 'On Floor',
    labelColor: 'text-emerald-700',
    badge: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  },
  'on-break': {
    dot: 'bg-amber-400',
    label: 'On Break',
    labelColor: 'text-amber-700',
    badge: 'bg-amber-50 border-amber-200 text-amber-700',
  },
  'clocked-out': {
    dot: 'bg-gray-300',
    label: 'Clocked Out',
    labelColor: 'text-gray-400',
    badge: 'bg-gray-50 border-gray-200 text-gray-500',
  },
};

const ROLE_BADGE = {
  TeamLead: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Manager: 'bg-purple-50 text-purple-700 border-purple-200',
  Associate: 'bg-gray-50 text-gray-500 border-gray-200',
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

const WorkloadBar = ({ current, max }) => {
  const pct = max > 0 ? (current / max) * 100 : 0;
  const barColor =
    pct >= 100
      ? 'bg-rose-400'
      : pct >= 66
      ? 'bg-amber-400'
      : 'bg-emerald-400';

  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-[10px] font-sans text-gray-400 tabular-nums">
        {current}/{max}
      </span>
    </div>
  );
};

const AssociateCard = ({ associate, workload, maxTasks, isLead }) => {
  const { clockInAssociate, clockOutAssociate, setAssociateOnBreak, returnFromBreak } =
    useAssignmentStore();

  const cfg = ATTENDANCE_CONFIG[associate.attendanceStatus] ?? ATTENDANCE_CONFIG['clocked-out'];
  const roleCfg = ROLE_BADGE[associate.role] ?? ROLE_BADGE.Associate;
  const isAvailable = associate.attendanceStatus === 'on-floor' && workload < maxTasks;

  return (
    <div
      className={`rounded-xl p-4 shadow-luxury border transition-all duration-200 ${
        associate.attendanceStatus === 'clocked-out'
          ? 'bg-gray-50/50 border-gray-100 opacity-60'
          : 'bg-white border-gray-100 hover:shadow-luxury-hover'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Avatar + Name */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-sans font-semibold shrink-0 ${
              isAvailable
                ? 'bg-charcoal text-white'
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            {associate.initials}
          </div>
          <div className="min-w-0">
            <p className="font-sans font-semibold text-sm text-charcoal truncate leading-tight">
              {associate.name}
            </p>
            <p className="text-[10px] font-sans text-gray-400 truncate">
              {associate.department}
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.badge}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
          {associate.role !== 'Associate' && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleCfg}`}>
              {associate.role}
            </span>
          )}
        </div>
      </div>

      {/* Workload bar — only for on-floor associates */}
      {associate.attendanceStatus !== 'clocked-out' && (
        <WorkloadBar current={workload} max={maxTasks} />
      )}

      {/* Lead controls */}
      {isLead && (
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {associate.attendanceStatus === 'clocked-out' && (
            <button
              onClick={() => clockInAssociate(associate.id)}
              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-sans font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              <LogIn size={10} />
              Clock In
            </button>
          )}
          {associate.attendanceStatus === 'on-floor' && (
            <>
              <button
                onClick={() => setAssociateOnBreak(associate.id)}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-sans font-semibold rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                <Coffee size={10} />
                Break
              </button>
              <button
                onClick={() => clockOutAssociate(associate.id)}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-sans font-semibold rounded-lg bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <LogOut size={10} />
                Clock Out
              </button>
            </>
          )}
          {associate.attendanceStatus === 'on-break' && (
            <button
              onClick={() => returnFromBreak(associate.id)}
              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-sans font-semibold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
            >
              <RotateCcw size={10} />
              Return
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const AssociatePool = () => {
  const associates = useAssignmentStore((s) => s.associates);
  const config = useAssignmentStore((s) => s.config);
  const canOverride = useAssignmentStore((s) => s.canOverride);
  const tasks = useAppStore((s) => s.tasks);

  const isLead = canOverride();
  const onFloor = associates.filter((a) => a.attendanceStatus === 'on-floor').length;
  const onBreak = associates.filter((a) => a.attendanceStatus === 'on-break').length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-lg font-medium text-charcoal">Associate Pool</h2>
        <div className="flex gap-2 text-xs font-sans">
          <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {onFloor} On Floor
          </span>
          {onBreak > 0 && (
            <span className="flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {onBreak} On Break
            </span>
          )}
        </div>
      </div>

      {/* Associate cards */}
      <div className="space-y-2.5">
        {associates.map((associate) => {
          const workload = tasks.filter(
            (t) =>
              t.assigneeId === associate.id &&
              (t.status === 'Assigned' || t.status === 'Active')
          ).length;

          return (
            <AssociateCard
              key={associate.id}
              associate={associate}
              workload={workload}
              maxTasks={config.maxTasksPerAssociate}
              isLead={isLead}
            />
          );
        })}
      </div>
    </div>
  );
};

export default AssociatePool;
