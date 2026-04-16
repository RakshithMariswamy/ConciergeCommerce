/**
 * AssociateDashboard
 * ──────────────────
 * Associate-focused view:
 *   - My Tasks  : tasks specifically assigned to this associate (highlighted)
 *   - Queue     : all pending tasks to self-assign
 *   - Clients   : client profiles
 *   - Cart      : cart builder
 *
 * Receives real-time notifications when a Team Lead assigns a task.
 */

import { useState } from 'react';
import {
  Bell, ClipboardList, Users, ShoppingBag,
  UserCheck, LogOut, CheckCircle, Clock, AlertCircle,
  Flag, Package,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import useAssignmentStore from '../store/useAssignmentStore';
import { useSimulatedSocket } from '../hooks/useSimulatedSocket';
import ClientProfile from '../components/associate/ClientProfile';
import CartBuilder from '../components/associate/CartBuilder';
import LeadOverridePanel from '../components/associate/LeadOverridePanel';
import NotificationDrawer from '../components/shared/NotificationDrawer';

// ─── COLOR-CODED STATUS (Green / Yellow / Orange / Red) ──────────────────────

const STATUS_VISUAL = {
  Pending: {
    card: 'bg-white border-red-200 border-l-red-500',
    bar: 'bg-gradient-to-r from-red-400 to-red-600',
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-600 border-red-200',
    action: 'bg-red-500 hover:bg-red-600 text-white',
    label: 'Pending',
  },
  Assigned: {
    card: 'bg-orange-50/50 border-orange-300 border-l-orange-500',
    bar: 'bg-gradient-to-r from-orange-400 to-orange-600',
    dot: 'bg-orange-500',
    badge: 'bg-orange-50 text-orange-700 border-orange-300',
    action: 'bg-orange-500 hover:bg-orange-600 text-white',
    label: 'Assigned',
  },
  Active: {
    card: 'bg-yellow-50/40 border-yellow-300 border-l-yellow-500',
    bar: 'bg-gradient-to-r from-yellow-400 to-amber-500',
    dot: 'bg-yellow-500',
    badge: 'bg-yellow-50 text-yellow-700 border-yellow-300',
    action: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    label: 'In Progress',
  },
  Completed: {
    card: 'bg-green-50/40 border-green-200 border-l-green-500',
    bar: 'bg-gradient-to-r from-green-400 to-green-600',
    dot: 'bg-green-500',
    badge: 'bg-green-50 text-green-700 border-green-200',
    action: 'bg-green-600 hover:bg-green-700 text-white',
    label: 'Completed',
  },
  Flagged: {
    card: 'bg-rose-50/50 border-rose-300 border-l-rose-600',
    bar: 'bg-gradient-to-r from-rose-500 to-red-600',
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    action: 'bg-rose-500 hover:bg-rose-600 text-white',
    label: 'Flagged',
  },
};

const TYPE_ICON = {
  'Fitting Room':    { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  'Click & Collect': { color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200'   },
  Assistance:        { color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200'  },
};

const timeAgo = (iso) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 1) return 'just now';
  if (d < 60) return `${d}m ago`;
  return `${Math.floor(d / 60)}h ${d % 60}m ago`;
};

// ─── MY TASK CARD ─────────────────────────────────────────────────────────────

const MyTaskCard = ({ task, isNew, onViewClient }) => {
  const [showOverride, setShowOverride] = useState(false);
  const { acceptTask, completeTask, selectCustomer, customers } = useAppStore();
  const canOverride = useAssignmentStore((s) => s.canOverride);
  const navigate = useNavigate();

  const isLead = canOverride();
  const vs = STATUS_VISUAL[task.status] ?? STATUS_VISUAL.Pending;
  const tc = TYPE_ICON[task.type] ?? TYPE_ICON.Assistance;
  const customerProfile = task.customerId ? customers.find((c) => c.id === task.customerId) : null;

  return (
    <>
      <div
        className={`
          rounded-2xl border-2 border-l-4 shadow-luxury hover:shadow-luxury-hover
          hover:-translate-y-0.5 transition-all duration-200 overflow-hidden
          ${vs.card}
          ${isNew ? 'ring-2 ring-orange-300 ring-offset-1' : ''}
        `}
      >
        {/* Top accent bar */}
        <div className={`h-1 ${vs.bar}`} />

        <div className="p-4 sm:p-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Task type */}
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${tc.bg} ${tc.border} ${tc.color}`}>
                <Package size={10} />
                {task.type}
              </span>
              {/* Status badge */}
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${vs.badge}`}>
                <span className={`w-2 h-2 rounded-full ${vs.dot}`} />
                {vs.label}
              </span>
              {/* Urgency */}
              {task.urgency === 'high' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold border border-red-200">
                  <AlertCircle size={9} />
                  Urgent
                </span>
              )}
              {/* New assignment pulse */}
              {isNew && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold border border-orange-200 animate-pulse">
                  ● New
                </span>
              )}
            </div>
          </div>

          {/* Customer */}
          <h3 className="font-serif text-xl font-semibold text-charcoal leading-tight">{task.customer}</h3>
          <p className="text-gray-500 text-sm font-sans mt-0.5 mb-3">{task.item}</p>

          {/* Meta row */}
          <div className="flex items-center gap-3 flex-wrap mb-4 text-xs text-gray-400 font-sans">
            {task.location && (
              <span className="flex items-center gap-1">📍 {task.location}</span>
            )}
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {timeAgo(task.receivedAt)}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 mb-3.5" />

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {task.status === 'Pending' && (
              <button
                onClick={() => acceptTask(task.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-charcoal text-white text-sm font-semibold hover:bg-gray-800 active:scale-95 transition-all"
              >
                <CheckCircle size={14} />
                Accept Task
              </button>
            )}
            {task.status === 'Assigned' && (
              <button
                onClick={() => acceptTask(task.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 active:scale-95 transition-all shadow-md"
              >
                <CheckCircle size={14} />
                Start Task
              </button>
            )}
            {task.status === 'Active' && (
              <>
                <button
                  onClick={() => completeTask(task.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 active:scale-95 transition-all"
                >
                  <CheckCircle size={14} />
                  Complete
                </button>
                <button
                  onClick={() => navigate('/live-shopping', {
                    state: {
                      role: 'stylist', source: 'associate-task',
                      task: { id: task.id, type: task.type, status: task.status, urgency: task.urgency, item: task.item, location: task.location, customer: task.customer, customerId: task.customerId },
                      customer: customerProfile || { id: task.customerId || null, name: task.customer, email: null, phone: null, tier: null },
                    },
                  })}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-yellow-500 text-white text-sm font-semibold hover:bg-yellow-600 active:scale-95 transition-all"
                >
                  Live Session
                </button>
              </>
            )}
            {task.status === 'Completed' && (
              <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-50 border-2 border-green-200 text-green-700 text-sm font-semibold">
                <CheckCircle size={14} className="fill-green-500 text-white" />
                Completed
              </div>
            )}
            {task.status === 'Flagged' && (
              <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-50 border-2 border-rose-200 text-rose-700 text-sm font-semibold">
                <Flag size={14} />
                Flagged for Review
              </div>
            )}
            {task.customerId && task.status !== 'Completed' && (
              <button
                onClick={() => { selectCustomer(task.customerId); if (onViewClient) onViewClient(task.customerId); }}
                className="px-3.5 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm hover:border-charcoal hover:text-charcoal transition-colors flex items-center gap-1.5"
              >
                <Users size={13} />
                Client
              </button>
            )}
            {isLead && task.status !== 'Completed' && (
              <button
                onClick={() => setShowOverride(true)}
                className="px-3 py-2.5 rounded-xl border border-dashed border-gray-300 text-gray-400 text-xs font-semibold hover:border-amber-400 hover:text-amber-600 transition-colors"
              >
                Override
              </button>
            )}
          </div>
        </div>
      </div>
      {showOverride && (
        <LeadOverridePanel task={task} onClose={() => setShowOverride(false)} />
      )}
    </>
  );
};

// ─── STAT STRIP ───────────────────────────────────────────────────────────────

const AssocStatStrip = ({ myTasks }) => {
  const pending   = myTasks.filter((t) => t.status === 'Pending').length;
  const assigned  = myTasks.filter((t) => t.status === 'Assigned').length;
  const active    = myTasks.filter((t) => t.status === 'Active').length;
  const completed = myTasks.filter((t) => t.status === 'Completed').length;

  return (
    <div className="grid grid-cols-4 gap-2 mb-5">
      {[
        { label: 'Pending',  value: pending,   color: 'text-red-500',     bg: 'bg-red-50',    border: 'border-red-100'    },
        { label: 'Assigned', value: assigned,  color: 'text-orange-500',  bg: 'bg-orange-50', border: 'border-orange-100' },
        { label: 'Active',   value: active,    color: 'text-yellow-600',  bg: 'bg-yellow-50', border: 'border-yellow-100' },
        { label: 'Done',     value: completed, color: 'text-green-600',   bg: 'bg-green-50',  border: 'border-green-100'  },
      ].map((s) => (
        <div key={s.label} className={`rounded-2xl p-3 text-center border shadow-luxury ${s.bg} ${s.border}`}>
          <p className={`text-2xl font-serif font-semibold ${s.color}`}>{s.value}</p>
          <p className="text-[9px] font-sans uppercase tracking-widest text-gray-400 mt-1">{s.label}</p>
        </div>
      ))}
    </div>
  );
};

// ─── MY TASKS TAB ────────────────────────────────────────────────────────────

const MyTasksTab = ({ currentUserId, notifications, onViewClient }) => {
  const tasks = useAppStore((s) => s.tasks);

  // Tasks assigned to this associate
  const myTasks = tasks.filter(
    (t) => t.assigneeId === currentUserId || t.status === 'Active' && t.assigneeId === currentUserId
  );

  // "New" = tasks that have an unread task_assigned notification for this associate
  const newTaskIds = new Set(
    notifications
      .filter((n) => n.type === 'task_assigned' && n.assigneeId === currentUserId)
      .map((n) => n.taskId)
  );

  const sorted = [...myTasks].sort((a, b) => {
    if (newTaskIds.has(a.id) && !newTaskIds.has(b.id)) return -1;
    if (!newTaskIds.has(a.id) && newTaskIds.has(b.id)) return 1;
    return 0;
  });

  if (sorted.length === 0) {
    return (
      <div className="text-center py-20 text-gray-300">
        <UserCheck size={40} strokeWidth={1} className="mx-auto mb-3 opacity-40" />
        <p className="font-serif text-base text-gray-400">No tasks assigned to you yet</p>
        <p className="text-sm font-sans text-gray-300 mt-1">Your Team Lead will assign tasks here</p>
      </div>
    );
  }

  return (
    <div>
      <AssocStatStrip myTasks={myTasks} />
      <div className="space-y-3">
        {sorted.map((task) => (
          <MyTaskCard key={task.id} task={task} isNew={newTaskIds.has(task.id)} onViewClient={onViewClient} />
        ))}
      </div>
    </div>
  );
};

// ─── QUEUE TAB (all pending, self-assignable) ─────────────────────────────────

const QueueTab = ({ onViewClient }) => {
  const tasks = useAppStore((s) => s.tasks);

  const pending = [...tasks.filter((t) => t.status === 'Pending')].sort(
    (a) => (a.urgency === 'high' ? -1 : 1)
  );

  return (
    <div>
      <p className="text-[11px] font-sans text-gray-400 mb-4">
        {pending.length} pending task{pending.length !== 1 ? 's' : ''} available to pick up
      </p>
      {pending.length === 0 ? (
        <div className="text-center py-20 text-gray-300">
          <CheckCircle size={36} strokeWidth={1} className="mx-auto mb-3 opacity-40" />
          <p className="font-sans text-sm">Queue is clear</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((task) => (
            <MyTaskCard key={task.id} task={task} isNew={false} onViewClient={onViewClient} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'mine',    label: 'My Tasks', Icon: UserCheck    },
  { id: 'queue',   label: 'Queue',    Icon: ClipboardList },
  { id: 'clients', label: 'Clients',  Icon: Users        },
  { id: 'cart',    label: 'Cart',     Icon: ShoppingBag  },
];

const AssociateDashboard = () => {
  const [activeTab, setActiveTab] = useState('mine');
  const [showNotifications, setShowNotifications] = useState(false);

  const navigate = useNavigate();
  const tasks = useAppStore((s) => s.tasks);
  const notifications = useAppStore((s) => s.notifications);
  const cart = useAppStore((s) => s.cart);
  const selectCustomer = useAppStore((s) => s.selectCustomer);
  const currentUser = useAssignmentStore((s) => s.currentUser);

  const handleViewClient = (customerId) => {
    selectCustomer(customerId);
    setActiveTab('clients');
  };

  useSimulatedSocket();

  const cartCount = cart.items.reduce((sum, i) => sum + i.qty, 0);
  const pendingQueue = tasks.filter((t) => t.status === 'Pending').length;
  const myTasks = tasks.filter((t) => t.assigneeId === currentUser.id);
  const myAssigned = myTasks.filter((t) => t.status === 'Assigned').length;

  // New assignment notifications for me
  const myNewNotifs = notifications.filter(
    (n) => n.type === 'task_assigned' && n.assigneeId === currentUser.id
  ).length;

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* ─── Header ─── */}
      <header className="bg-charcoal text-white sticky top-0 z-50 shadow-xl">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/macys-logo.svg" alt="Macys" className="h-5 w-auto brightness-0 invert" />
            <div>
              <h1 className="font-serif text-lg font-light tracking-wide leading-none">
                Concierge Hub
              </h1>
              <p className="text-white/40 text-[9px] font-sans uppercase tracking-widest mt-0.5">
                Associate Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="bg-amber-500/20 text-amber-300 text-[9px] font-semibold px-2 py-0.5 rounded-full border border-amber-500/30 uppercase tracking-wider">
                Associate
              </span>
              <p className="text-white text-sm font-sans font-medium mt-0.5">{currentUser.name}</p>
            </div>

            {/* Notification bell — green glow when new assignment */}
            <button
              onClick={() => setShowNotifications((p) => !p)}
              className={`relative p-2 rounded-lg transition-colors ${
                myNewNotifs > 0 ? 'bg-green-500/20 hover:bg-green-500/30' : 'hover:bg-white/5'
              }`}
            >
              <Bell
                size={20}
                className={myNewNotifs > 0 ? 'text-green-400' : 'text-white/70'}
                strokeWidth={1.5}
              />
              {notifications.length > 0 && (
                <span className={`absolute -top-0.5 -right-0.5 text-charcoal text-[9px] rounded-full h-4 w-4 flex items-center justify-center font-bold ${
                  myNewNotifs > 0 ? 'bg-green-400' : 'bg-gold'
                }`}>
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

        {/* Tabs */}
        <div className="max-w-5xl mx-auto flex border-t border-white/8">
          {TABS.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            const badge =
              id === 'mine'   ? myAssigned :
              id === 'queue'  ? pendingQueue :
              id === 'cart'   ? cartCount : 0;

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
                    <span className={`absolute -top-1.5 -right-1.5 text-charcoal text-[8px] rounded-full h-3.5 w-3.5 flex items-center justify-center font-bold ${
                      id === 'mine' && myNewNotifs > 0 ? 'bg-green-400' : 'bg-gold'
                    }`}>
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

      {/* Notification drawer */}
      {showNotifications && (
        <NotificationDrawer onClose={() => setShowNotifications(false)} />
      )}

      {/* Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {activeTab === 'mine'    && (
          <MyTasksTab currentUserId={currentUser.id} notifications={notifications} onViewClient={handleViewClient} />
        )}
        {activeTab === 'queue'   && <QueueTab onViewClient={handleViewClient} />}
        {activeTab === 'clients' && <ClientProfile />}
        {activeTab === 'cart'    && <CartBuilder />}
      </main>
    </div>
  );
};

export default AssociateDashboard;
