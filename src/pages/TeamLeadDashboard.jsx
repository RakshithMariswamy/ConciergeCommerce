/**
 * TeamLeadDashboard
 * ─────────────────
 * Management-focused dashboard for Team Lead / Manager roles.
 * Tabs: Overview · Assign · All Tasks · Team
 */

import { useEffect, useState } from 'react';
import {
  Bell, LayoutDashboard, GitBranch, ClipboardList,
  Users, LogOut, TrendingUp, Clock, CheckCircle,
  AlertCircle, Flag, UserCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import useAssignmentStore from '../store/useAssignmentStore';
import { useSimulatedSocket } from '../hooks/useSimulatedSocket';
import TaskQueue from '../components/associate/TaskQueue';
import TaskAssignmentModule from '../components/associate/TaskAssignmentModule';
import AssociatePool from '../components/associate/AssociatePool';
import ClientProfile from '../components/associate/ClientProfile';
import NotificationDrawer from '../components/shared/NotificationDrawer';
import OrchestratorActivityPanel from '../components/shared/OrchestratorActivityPanel';
import { useAgent } from '../hooks/useAgent';
import { createAuditEntry, AuditAction } from '../services/auditLogger';

// ─── TAB CONFIG ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'assign',   label: 'Assign',   Icon: GitBranch       },
  { id: 'ai-insights', label: 'AI Insights', Icon: TrendingUp },
  { id: 'tasks',    label: 'All Tasks', Icon: ClipboardList   },
  { id: 'clients',  label: 'Clients',  Icon: Users           },
  { id: 'team',     label: 'Team',     Icon: UserCheck       },
];

// ─── KPI CARD ─────────────────────────────────────────────────────────────────

const KpiCard = ({ label, value, Icon, color, bg, border }) => (
  <div className={`rounded-2xl border p-4 ${bg} ${border} shadow-luxury`}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-sans font-semibold uppercase tracking-widest text-gray-400">
        {label}
      </span>
      <div className={`w-7 h-7 rounded-xl ${color} bg-current/10 flex items-center justify-center`}>
        <Icon size={13} className={color} strokeWidth={2} />
      </div>
    </div>
    <p className={`font-serif text-3xl font-semibold leading-none ${color}`}>{value}</p>
  </div>
);

// ─── RECENT ACTIVITY ENTRY ────────────────────────────────────────────────────

const ActivityEntry = ({ entry }) => {
  const colorMap = {
    info:    'bg-blue-400',
    warn:    'bg-amber-400',
    error:   'bg-rose-400',
    success: 'bg-emerald-400',
  };
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-gray-50 last:border-0">
      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${colorMap[entry.severity] ?? 'bg-gray-300'}`} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-900 font-sans">{entry.label}</p>
        {entry.taskId && (
          <p className="text-[10px] text-gray-400 font-sans">Task #{entry.taskId}</p>
        )}
      </div>
      <p className="text-[10px] text-gray-300 font-sans tabular-nums shrink-0">
        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
};

// ─── OVERVIEW TAB ─────────────────────────────────────────────────────────────

const OverviewTab = () => {
  const tasks = useAppStore((s) => s.tasks);
  const associates = useAssignmentStore((s) => s.associates);
  const auditLog = useAssignmentStore((s) => s.auditLog);

  const onFloor = associates.filter((a) => a.attendanceStatus === 'on-floor').length;
  const onBreak = associates.filter((a) => a.attendanceStatus === 'on-break').length;
  const counts = {
    pending:   tasks.filter((t) => t.status === 'Pending').length,
    assigned:  tasks.filter((t) => t.status === 'Assigned').length,
    active:    tasks.filter((t) => t.status === 'Active').length,
    completed: tasks.filter((t) => t.status === 'Completed').length,
    flagged:   tasks.filter((t) => t.status === 'Flagged').length,
  };

  const kpis = [
    { label: 'On Floor',  value: onFloor,          Icon: UserCheck,    color: 'text-emerald-600', bg: 'bg-emerald-50/50', border: 'border-emerald-100' },
    { label: 'Pending',   value: counts.pending,   Icon: AlertCircle,  color: 'text-red-500',     bg: 'bg-red-50/50',    border: 'border-red-100'    },
    { label: 'Assigned',  value: counts.assigned,  Icon: Clock,        color: 'text-orange-500',  bg: 'bg-orange-50/50', border: 'border-orange-100' },
    { label: 'Active',    value: counts.active,    Icon: TrendingUp,   color: 'text-yellow-600',  bg: 'bg-yellow-50/50', border: 'border-yellow-100' },
    { label: 'Completed', value: counts.completed, Icon: CheckCircle,  color: 'text-green-600',   bg: 'bg-green-50/50',  border: 'border-green-100'  },
    { label: 'Flagged',   value: counts.flagged,   Icon: Flag,         color: 'text-rose-600',    bg: 'bg-rose-50/50',   border: 'border-rose-100'   },
  ];

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      {/* Orchestrator observability */}
      <OrchestratorActivityPanel />

      {/* Two-column: associate status + recent activity */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Associate status */}
        <div className="bg-white rounded-2xl shadow-luxury border border-gray-100 p-5">
          <h3 className="font-serif text-base font-medium text-slate-900 mb-4">Floor Status</h3>
          <div className="space-y-2">
            {associates.map((a) => {
              const dotColor =
                a.attendanceStatus === 'on-floor'
                  ? 'bg-emerald-400'
                  : a.attendanceStatus === 'on-break'
                  ? 'bg-amber-400'
                  : 'bg-gray-300';
              const taskCount = tasks.filter(
                (t) => t.assigneeId === a.id && (t.status === 'Assigned' || t.status === 'Active')
              ).length;

              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                    <span className="text-sm font-sans font-medium text-slate-900">{a.name}</span>
                    {a.role === 'TeamLead' && (
                      <span className="text-[9px] bg-indigo-50 text-indigo-600 border border-indigo-200 rounded px-1.5 font-semibold">
                        TL
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {taskCount > 0 && (
                      <span className="text-[10px] text-gray-500 font-sans">
                        {taskCount} task{taskCount > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 font-sans capitalize">
                      {a.attendanceStatus.replace('-', ' ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-3 text-[11px] font-sans text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {onFloor} on floor
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {onBreak} on break
            </span>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-2xl shadow-luxury border border-gray-100 p-5">
          <h3 className="font-serif text-base font-medium text-slate-900 mb-4">Recent Activity</h3>
          {auditLog.length === 0 ? (
            <p className="text-xs text-gray-300 font-sans italic text-center py-8">
              No activity yet. Assign a task to get started.
            </p>
          ) : (
            <div>
              {auditLog.slice(0, 8).map((entry) => (
                <ActivityEntry key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── TEAM TAB ────────────────────────────────────────────────────────────────

const TeamTab = () => (
  <div className="bg-white rounded-2xl shadow-luxury border border-gray-100 p-5">
    <AssociatePool />
  </div>
);

const AIInsightsTab = () => {
  const auditLog = useAssignmentStore((s) => s.auditLog);
  const associates = useAssignmentStore((s) => s.associates);
  const addAuditEntry = useAssignmentStore((s) => s.addAuditEntry);
  const currentUser = useAssignmentStore((s) => s.currentUser);
  const { invokeRouted, isThinking, result } = useAgent('orchestrator');

  const runInsights = async () => {
    const routed = await invokeRouted({
      intent: 'Analyze recent operational audit activity and identify workload or SLA risks.',
      context: {
        tab: 'ai-insights',
        auditEntryCount: auditLog.length,
        associateCount: associates.length,
      },
      payloadByAgent: {
        audit_analysis: {
          auditEntries: auditLog,
          associates,
          timeWindowMinutes: 120,
        },
      },
      defaultPayload: {
        auditEntries: auditLog,
        associates,
        timeWindowMinutes: 120,
      },
    });

    const insights = routed?.result;

    addAuditEntry(
      createAuditEntry({
        action: AuditAction.AI_INSIGHT_GENERATED,
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        reason:
          insights?.summary ||
          routed?.route?.reason ||
          'AI insights generated from audit timeline.',
        metadata: {
          routedAgent: routed?.route?.agent || null,
        },
      })
    );
  };

  const routedAgent = result?.route?.agent || null;
  const insights = result?.executed ? result.result : null;

  useEffect(() => {
    void runInsights();
    const timer = window.setInterval(() => {
      void runInsights();
    }, 5 * 60 * 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-luxury border border-gray-100 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-base font-medium text-slate-900">AI Operational Insights</h3>
            <p className="text-xs text-gray-400 font-sans mt-1">
              Patterns from audit activity, workload drift, and coaching flags.
            </p>
            {routedAgent && (
              <p className="text-[10px] text-indigo-600 font-sans mt-1 uppercase tracking-wider">
                Routed via orchestrator to: {routedAgent}
              </p>
            )}
          </div>
          <button
            onClick={runInsights}
            disabled={isThinking}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-sans font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
          >
            {isThinking ? 'Analyzing...' : 'Refresh Insights'}
          </button>
        </div>
      </div>

      {insights && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-luxury border border-gray-100 p-5">
            <p className="text-[10px] font-sans uppercase tracking-wider text-gray-400 mb-3">
              Summary
            </p>
            <p className="text-sm font-sans text-slate-900">{insights.summary || 'No summary available.'}</p>
            <p className="text-xs font-sans text-gray-400 mt-2">
              SLA Breach Risk: <span className="font-semibold text-slate-900">{insights.slaBreachRisk || 'unknown'}</span>
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-luxury border border-gray-100 p-5">
            <p className="text-[10px] font-sans uppercase tracking-wider text-gray-400 mb-3">
              Coaching Flags
            </p>
            {Array.isArray(insights.coachingFlags) && insights.coachingFlags.length > 0 ? (
              <div className="space-y-2">
                {insights.coachingFlags.slice(0, 5).map((flag, idx) => (
                  <p key={`${flag.associateId || idx}-${idx}`} className="text-xs font-sans text-slate-900">
                    • {flag.associateName || flag.associateId}: {flag.note || `${flag.autoReassignCount} auto-reassignments`}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-xs font-sans text-gray-400">No coaching flags detected in current window.</p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-luxury border border-gray-100 p-5 sm:col-span-2">
            <p className="text-[10px] font-sans uppercase tracking-wider text-gray-400 mb-3">
              Workload Imbalance
            </p>
            {Array.isArray(insights.workloadImbalances) && insights.workloadImbalances.length > 0 ? (
              <div className="grid sm:grid-cols-3 gap-2">
                {insights.workloadImbalances.slice(0, 6).map((row, idx) => (
                  <div key={`${row.associateId || idx}-${idx}`} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                    <p className="text-sm font-sans font-semibold text-slate-900">{row.associateName || row.associateId}</p>
                    <p className="text-xs text-gray-400 font-sans mt-0.5">{row.assignmentCount || 0} assignments</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-sans text-gray-400">No imbalance data available yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────

const TeamLeadDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showNotifications, setShowNotifications] = useState(false);

  const navigate = useNavigate();
  const tasks = useAppStore((s) => s.tasks);
  const notifications = useAppStore((s) => s.notifications);
  const selectCustomer = useAppStore((s) => s.selectCustomer);
  const currentUser = useAssignmentStore((s) => s.currentUser);

  const handleViewClient = (customerId) => {
    selectCustomer(customerId);
    setActiveTab('clients');
  };

  useSimulatedSocket();

  const pendingCount  = tasks.filter((t) => t.status === 'Pending').length;
  const assignedCount = tasks.filter((t) => t.status === 'Assigned').length;
  const alertCount    = pendingCount + assignedCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 flex flex-col">
      {/* ─── Header ─── */}
      <header className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 text-white sticky top-0 z-50 shadow-xl">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/macys-logo.svg" alt="Macys" className="h-5 w-auto brightness-0 invert" />
            <div>
              <h1 className="font-serif text-lg font-light tracking-wide leading-none">
                Concierge Hub
              </h1>
              <p className="text-white/40 text-[9px] font-sans uppercase tracking-widest mt-0.5">
                Team Lead Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="bg-indigo-500/20 text-indigo-300 text-[9px] font-semibold px-2 py-0.5 rounded-full border border-indigo-500/30 uppercase tracking-wider">
                  Team Lead
                </span>
              </div>
              <p className="text-white text-sm font-sans font-medium mt-0.5">{currentUser.name}</p>
            </div>

            {/* Notification bell */}
            <button
              onClick={() => setShowNotifications((p) => !p)}
              className="relative p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <Bell size={20} className="text-white/70" strokeWidth={1.5} />
              {notifications.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-amber-400 text-slate-900 text-[9px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>

            {/* Switch role */}
            <button
              onClick={() => navigate('/', { replace: true })}
              className="flex items-center gap-1.5 p-2 hover:bg-white/5 rounded-lg transition-colors text-white/50 hover:text-white/90"
              title="Switch role"
            >
              <LogOut size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-5xl mx-auto flex border-t border-white/8">
          {TABS.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            const badge = id === 'assign' ? alertCount : id === 'tasks' ? pendingCount : 0;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 py-3.5 px-1.5 text-xs sm:text-sm font-sans font-semibold uppercase tracking-wider transition-all duration-200 border-b-2 ${
                  isActive
                    ? 'text-white border-white bg-white/10'
                    : 'text-white/70 hover:text-white border-transparent'
                }`}
              >
                <div className="relative">
                  <Icon size={15} strokeWidth={isActive ? 2 : 1.75} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-900 text-[8px] rounded-full h-3.5 w-3.5 flex items-center justify-center font-bold">
                      {badge}
                    </span>
                  )}
                </div>
                <span className="leading-none">{label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* ─── Notification drawer ─── */}
      {showNotifications && (
        <NotificationDrawer onClose={() => setShowNotifications(false)} />
      )}

      {/* ─── Content ─── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'assign'   && <TaskAssignmentModule />}
        {activeTab === 'ai-insights' && <AIInsightsTab />}
        {activeTab === 'tasks'    && <TaskQueue onViewClient={handleViewClient} />}
        {activeTab === 'clients'  && <ClientProfile />}
        {activeTab === 'team'     && <TeamTab />}
      </main>
    </div>
  );
};

export default TeamLeadDashboard;
