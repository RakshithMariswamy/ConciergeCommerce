/**
 * TaskAssignmentModule
 * ────────────────────
 * Top-level container for the Dynamic Task Assignment feature.
 * Composes: AttendanceStatusBar, AssociatePool, AssignmentQueue, AuditLogPanel.
 * Bootstraps the attendance sync and auto-reassignment hooks.
 *
 * Config controls (TeamLead+): maxTasksPerAssociate, autoReassignMinutes.
 */

import { useState } from 'react';
import { Settings, ChevronDown, ChevronUp, Users, ListOrdered } from 'lucide-react';
import AttendanceStatusBar from '../shared/AttendanceStatusBar';
import AssociatePool from './AssociatePool';
import AssignmentQueue from './AssignmentQueue';
import AuditLogPanel from './AuditLogPanel';
import { useAttendanceSync } from '../../hooks/useAttendanceSync';
import { useAutoReassignment } from '../../hooks/useAutoReassignment';
import useAssignmentStore from '../../store/useAssignmentStore';
import useAppStore from '../../store/useAppStore';

// ─── CONFIG PANEL ─────────────────────────────────────────────────────────────

const ConfigPanel = ({ config, onUpdate, currentUser }) => {
  const isLead =
    currentUser.role === 'TeamLead' || currentUser.role === 'Manager';

  if (!isLead) return null;

  return (
    <div className="bg-white rounded-2xl shadow-luxury border border-gray-100 p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Settings size={14} className="text-gray-400" />
        <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-gray-500">
          Assignment Config
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-sans text-gray-400 mb-1">
            Max tasks / associate
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={config.maxTasksPerAssociate}
            onChange={(e) => onUpdate('maxTasksPerAssociate', Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-sans text-charcoal focus:outline-none focus:border-charcoal transition-colors"
          />
        </div>
        <div>
          <label className="block text-[10px] font-sans text-gray-400 mb-1">
            Auto-reassign after (mins)
          </label>
          <input
            type="number"
            min={1}
            max={60}
            value={config.autoReassignMinutes}
            onChange={(e) => onUpdate('autoReassignMinutes', Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-sans text-charcoal focus:outline-none focus:border-charcoal transition-colors"
          />
        </div>
      </div>
    </div>
  );
};

// ─── STATS STRIP ─────────────────────────────────────────────────────────────

const StatsStrip = ({ tasks, associates }) => {
  const onFloor = associates.filter((a) => a.attendanceStatus === 'on-floor').length;
  const pendingCount = tasks.filter((t) => t.status === 'Pending').length;
  const assignedCount = tasks.filter((t) => t.status === 'Assigned').length;
  const activeCount = tasks.filter((t) => t.status === 'Active').length;
  const flaggedCount = tasks.filter((t) => t.status === 'Flagged').length;

  const stats = [
    { label: 'On Floor', value: onFloor, color: 'text-emerald-600' },
    { label: 'Queued', value: pendingCount, color: 'text-rose-500' },
    { label: 'Assigned', value: assignedCount, color: 'text-teal-500' },
    { label: 'Active', value: activeCount, color: 'text-indigo-500' },
    ...(flaggedCount > 0
      ? [{ label: 'Flagged', value: flaggedCount, color: 'text-amber-500' }]
      : []),
  ];

  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-white rounded-xl p-3 shadow-luxury text-center">
          <p className={`text-2xl font-serif font-medium ${s.color}`}>{s.value}</p>
          <p className="text-[9px] font-sans uppercase tracking-wider text-gray-400 mt-0.5">
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
};

// ─── MOBILE TAB ───────────────────────────────────────────────────────────────

const MOBILE_TABS = [
  { id: 'queue', label: 'Queue', Icon: ListOrdered },
  { id: 'pool', label: 'Associates', Icon: Users },
];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const TaskAssignmentModule = () => {
  const [mobileTab, setMobileTab] = useState('queue');

  // Bootstrap background hooks
  useAttendanceSync();
  useAutoReassignment();

  const config = useAssignmentStore((s) => s.config);
  const updateConfig = useAssignmentStore((s) => s.updateConfig);
  const associates = useAssignmentStore((s) => s.associates);
  const currentUser = useAssignmentStore((s) => s.currentUser);
  const tasks = useAppStore((s) => s.tasks);

  return (
    <div>
      {/* Degraded mode warning */}
      <AttendanceStatusBar />

      {/* Stats */}
      <StatsStrip tasks={tasks} associates={associates} />

      {/* Config controls (TeamLead+ only) */}
      <ConfigPanel
        config={config}
        onUpdate={updateConfig}
        currentUser={currentUser}
      />

      {/* Mobile tab switcher */}
      <div className="flex sm:hidden gap-2 mb-4 border-b border-gray-100 pb-3">
        {MOBILE_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setMobileTab(id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-sans font-semibold transition-all border ${
              mobileTab === id
                ? 'bg-charcoal text-white border-charcoal'
                : 'bg-white text-gray-500 border-gray-200'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Desktop: side-by-side; Mobile: tab-switched */}
      <div className="hidden sm:grid sm:grid-cols-2 gap-5 mb-5">
        <div className="bg-white rounded-2xl shadow-luxury border border-gray-100 p-5">
          <AssignmentQueue />
        </div>
        <div className="bg-white rounded-2xl shadow-luxury border border-gray-100 p-5">
          <AssociatePool />
        </div>
      </div>

      <div className="sm:hidden mb-5">
        <div className="bg-white rounded-2xl shadow-luxury border border-gray-100 p-4">
          {mobileTab === 'queue' ? <AssignmentQueue /> : <AssociatePool />}
        </div>
      </div>

      {/* Audit log */}
      <AuditLogPanel />
    </div>
  );
};

export default TaskAssignmentModule;
