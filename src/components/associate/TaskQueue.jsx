import { useState } from 'react';
import {
  Clock, MapPin, CheckCircle, RefreshCw, AlertCircle,
  User, Flag, Zap, Star, Package, Scissors, HelpCircle,
  ChevronRight, Play,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../../store/useAppStore';
import useAssignmentStore from '../../store/useAssignmentStore';
import LeadOverridePanel from './LeadOverridePanel';

// ─── STATUS DESIGN SYSTEM ────────────────────────────────────────────────────
// Color legend: 🔴 Red=Pending  🟠 Orange=Assigned  🟡 Yellow=Active  🟢 Green=Completed

const STATUS = {
  Pending: {
    label: 'Pending',
    cardBg: 'bg-white',
    cardBorder: 'border-red-200',
    accentBar: 'bg-gradient-to-r from-red-400 to-red-600',
    leftBorder: 'border-l-red-500',
    badge: 'bg-red-50 text-red-600 border-red-200',
    dot: 'bg-red-500',
    icon: <AlertCircle size={11} />,
  },
  Assigned: {
    label: 'Assigned',
    cardBg: 'bg-orange-50/40',
    cardBorder: 'border-orange-300',
    accentBar: 'bg-gradient-to-r from-orange-400 to-orange-600',
    leftBorder: 'border-l-orange-500',
    badge: 'bg-orange-50 text-orange-700 border-orange-300',
    dot: 'bg-orange-500',
    icon: <User size={11} />,
  },
  Active: {
    label: 'In Progress',
    cardBg: 'bg-yellow-50/40',
    cardBorder: 'border-yellow-300',
    accentBar: 'bg-gradient-to-r from-yellow-400 to-amber-500',
    leftBorder: 'border-l-yellow-500',
    badge: 'bg-yellow-50 text-yellow-700 border-yellow-300',
    dot: 'bg-yellow-500',
    icon: <Play size={11} />,
  },
  Completed: {
    label: 'Completed',
    cardBg: 'bg-green-50/40',
    cardBorder: 'border-green-200',
    accentBar: 'bg-gradient-to-r from-green-400 to-green-600',
    leftBorder: 'border-l-green-500',
    badge: 'bg-green-50 text-green-700 border-green-200',
    dot: 'bg-green-500',
    icon: <CheckCircle size={11} />,
  },
  Flagged: {
    label: 'Flagged',
    cardBg: 'bg-rose-50/50',
    cardBorder: 'border-rose-300',
    accentBar: 'bg-gradient-to-r from-rose-500 to-red-600',
    leftBorder: 'border-l-rose-600',
    badge: 'bg-rose-50 text-rose-700 border-rose-300',
    dot: 'bg-rose-500',
    icon: <Flag size={11} />,
  },
};

// ─── TASK TYPE CONFIG ─────────────────────────────────────────────────────────

const TASK_TYPE = {
  'Fitting Room': {
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    dot: 'bg-purple-400',
    Icon: Scissors,
  },
  'Click & Collect': {
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    dot: 'bg-blue-400',
    Icon: Package,
  },
  Assistance: {
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-400',
    Icon: HelpCircle,
  },
};

// ─── FILTER CONFIG ────────────────────────────────────────────────────────────

// Filter pill active colors match the GYOR legend
const FILTERS = [
  { key: 'All',       label: 'All',      active: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent' },
  { key: 'Pending',   label: 'Pending',  active: 'bg-red-500 text-white border-red-500'            },
  { key: 'Assigned',  label: 'Assigned', active: 'bg-orange-500 text-white border-orange-500'      },
  { key: 'Active',    label: 'Active',   active: 'bg-yellow-400 text-slate-900 border-yellow-400'   },
  { key: 'Completed', label: 'Done',     active: 'bg-emerald-500 text-white border-emerald-500'        },
  { key: 'Flagged',   label: 'Flagged',  active: 'bg-rose-600 text-white border-rose-600'          },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const timeAgo = (iso) => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1)   return 'just now';
  if (diff === 1) return '1 min ago';
  if (diff < 60)  return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ${diff % 60}m ago`;
};

const ageColor = (iso) => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff > 30) return 'text-rose-500';
  if (diff > 15) return 'text-amber-500';
  return 'text-gray-400';
};

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────

const StatusPill = ({ status }) => {
  const s = STATUS[status] ?? STATUS.Pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

// ─── TASK CARD ────────────────────────────────────────────────────────────────

const TaskCard = ({ task, onViewClient }) => {
  const navigate = useNavigate();
  const [showOverride, setShowOverride] = useState(false);

  const { acceptTask, completeTask, selectCustomer, customers } = useAppStore();
  const associates = useAssignmentStore((s) => s.associates);
  const canOverride = useAssignmentStore((s) => s.canOverride);

  const isLead = canOverride();
  const s = STATUS[task.status] ?? STATUS.Pending;
  const typeCfg = TASK_TYPE[task.type] ?? TASK_TYPE.Assistance;
  const TypeIcon = typeCfg.Icon;

  const customerProfile = task.customerId
    ? customers.find((c) => c.id === task.customerId)
    : null;

  const assignee = task.assigneeId
    ? associates.find((a) => a.id === task.assigneeId)
    : null;

  const isUrgent = task.urgency === 'high';
  const isVIP = task.customerTier === 'Platinum';
  const isOld = Math.floor((Date.now() - new Date(task.receivedAt).getTime()) / 60000) > 20;

  const handleViewClient = () => {
    if (!task.customerId) return;
    selectCustomer(task.customerId);
    if (onViewClient) onViewClient(task.customerId);
  };

  const handleLiveSession = () => {
    navigate('/live-shopping', {
      state: {
        role: 'stylist',
        source: 'associate-task',
        task: {
          id: task.id, type: task.type, status: task.status,
          urgency: task.urgency, item: task.item,
          location: task.location, customer: task.customer,
          customerId: task.customerId,
        },
        customer: customerProfile || {
          id: task.customerId || null, name: task.customer,
          email: null, phone: null, tier: null,
        },
      },
    });
  };

  return (
    <>
      <div
        className={`
          rounded-2xl border border-l-4 shadow-luxury
          hover:shadow-luxury-hover hover:-translate-y-0.5
          transition-all duration-200
          ${s.cardBg} ${s.cardBorder} ${s.leftBorder}
          overflow-hidden
        `}
      >
        {/* ── Top accent bar (urgency indicator) */}
        <div className={`h-[3px] ${s.accentBar} ${isUrgent ? 'opacity-100' : 'opacity-50'}`} />

        <div className="p-4 sm:p-5">
          {/* ── Row 1: Type chip + badges */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {/* Task type chip */}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${typeCfg.bg} ${typeCfg.border} ${typeCfg.color}`}>
              <TypeIcon size={11} strokeWidth={2} />
              {task.type}
            </span>

            {/* Status pill */}
            <StatusPill status={task.status} />

            {/* Urgency */}
            {isUrgent && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200">
                <Zap size={9} className="fill-rose-600" />
                URGENT
              </span>
            )}

            {/* VIP */}
            {isVIP && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-300">
                <Star size={9} className="fill-amber-500" />
                VIP
              </span>
            )}

            {/* Re-tried indicator */}
            {task.autoReassignCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 text-[10px] font-semibold border border-orange-200">
                ↺ ×{task.autoReassignCount}
              </span>
            )}
          </div>

          {/* ── Row 2: Customer name + item */}
          <div className="mb-3">
            <h3 className="font-serif text-[1.15rem] font-semibold text-slate-900 leading-snug">
              {task.customer}
            </h3>
            <p className="text-gray-500 text-sm font-sans mt-0.5 leading-snug">{task.item}</p>
          </div>

          {/* ── Row 3: Assignee + meta */}
          <div className="flex items-center gap-3 flex-wrap mb-4">
            {/* Assignee chip */}
            {assignee ? (
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${s.badge}`}>
                <div className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[8px] font-black">
                  {assignee.initials}
                </div>
                {assignee.name}
              </div>
            ) : task.status === 'Pending' ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-300 font-sans italic">
                <User size={10} />
                Unassigned
              </span>
            ) : null}

            {/* Location */}
            {task.location && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 font-sans">
                <MapPin size={10} />
                {task.location}
              </span>
            )}

            {/* Age */}
            <span className={`inline-flex items-center gap-1 text-[11px] font-sans ${ageColor(task.receivedAt)}`}>
              <Clock size={10} />
              {timeAgo(task.receivedAt)}
              {isOld && task.status === 'Pending' && (
                <span className="ml-0.5 text-rose-500 font-bold">!</span>
              )}
            </span>
          </div>

          {/* ── Divider */}
          <div className="border-t border-gray-100 mb-3.5" />

          {/* ── Row 4: Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">

            {/* PENDING → accept self-assign */}
            {task.status === 'Pending' && (
              <button
                onClick={() => acceptTask(task.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 active:scale-95 transition-all"
              >
                <CheckCircle size={14} />
                Accept Task
              </button>
            )}

            {/* ASSIGNED → accept the assigned task */}
            {task.status === 'Assigned' && (
              <button
                onClick={() => acceptTask(task.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 active:scale-95 transition-all"
              >
                <ChevronRight size={14} />
                Start Task
              </button>
            )}

            {/* ACTIVE → complete + live session */}
            {task.status === 'Active' && (
              <>
                <button
                  onClick={() => completeTask(task.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 active:scale-95 transition-all"
                >
                  <CheckCircle size={14} />
                  Complete
                </button>
                <button
                  onClick={handleLiveSession}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  <Play size={13} className="fill-white" />
                  Live Session
                </button>
              </>
            )}

            {/* COMPLETED → green */}
            {task.status === 'Completed' && (
              <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-50 border-2 border-green-200 text-green-700 text-sm font-semibold">
                <CheckCircle size={14} className="fill-green-500 text-white" />
                Task Completed
              </div>
            )}

            {/* FLAGGED → red */}
            {task.status === 'Flagged' && (
              <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-50 border-2 border-rose-200 text-rose-700 text-sm font-semibold">
                <Flag size={14} />
                Flagged for Review
              </div>
            )}

            {/* Client button */}
            {task.customerId && task.status !== 'Completed' && (
              <button
                onClick={handleViewClient}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-sans hover:border-indigo-600 hover:text-indigo-600 transition-colors"
              >
                <User size={13} />
                Client
              </button>
            )}

            {/* Lead override */}
            {isLead && task.status !== 'Completed' && (
              <button
                onClick={() => setShowOverride(true)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-gray-300 text-gray-400 text-xs font-semibold hover:border-amber-400 hover:text-amber-600 transition-colors"
                title="Lead Override"
              >
                <Flag size={11} />
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

// ─── STAT CARD ────────────────────────────────────────────────────────────────

const StatCard = ({ label, value, color, bg, borderColor, onClick, active }) => (
  <button
    onClick={onClick}
    className={`
      rounded-2xl p-4 text-center transition-all duration-200 border
      ${bg} ${borderColor}
      ${active ? 'shadow-luxury-hover scale-[1.02]' : 'shadow-luxury hover:shadow-luxury-hover'}
    `}
  >
    <p className={`text-3xl font-serif font-semibold ${color} leading-none`}>{value}</p>
    <p className="text-[10px] font-sans uppercase tracking-widest text-gray-400 mt-1.5">{label}</p>
  </button>
);

// ─── TASK QUEUE ───────────────────────────────────────────────────────────────

const STAT_MAP = [
  { status: 'Pending',   label: 'Queued',    color: 'text-rose-500',    bg: 'bg-white',           border: 'border-rose-100'    },
  { status: 'Assigned',  label: 'Assigned',  color: 'text-teal-600',    bg: 'bg-teal-50/50',      border: 'border-teal-100'    },
  { status: 'Active',    label: 'Active',    color: 'text-indigo-500',  bg: 'bg-white',           border: 'border-indigo-100'  },
  { status: 'Completed', label: 'Done',      color: 'text-emerald-500', bg: 'bg-emerald-50/50',   border: 'border-emerald-100' },
  { status: 'Flagged',   label: 'Flagged',   color: 'text-amber-500',   bg: 'bg-amber-50/50',     border: 'border-amber-100'   },
];

const TaskQueue = ({ onViewClient }) => {
  const { tasks } = useAppStore();
  const [filter, setFilter] = useState('All');

  const counts = Object.fromEntries(
    STAT_MAP.map(({ status }) => [status, tasks.filter((t) => t.status === status).length])
  );

  const filtered = filter === 'All' ? tasks : tasks.filter((t) => t.status === filter);

  // Sort: urgency high first, then by receivedAt desc
  const sorted = [...filtered].sort((a, b) => {
    if (a.urgency === 'high' && b.urgency !== 'high') return -1;
    if (b.urgency === 'high' && a.urgency !== 'high') return 1;
    return new Date(a.receivedAt) - new Date(b.receivedAt);
  });

  return (
    <div>
      {/* ── Stat strip */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3 mb-6">
        {STAT_MAP.map(({ status, label, color, bg, border }) => (
          <StatCard
            key={status}
            label={label}
            value={counts[status]}
            color={color}
            bg={bg}
            borderColor={border}
            active={filter === status}
            onClick={() => setFilter((f) => (f === status ? 'All' : status))}
          />
        ))}
      </div>

      {/* ── Filter pills */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {FILTERS.map(({ key, label, active }) => {
          const count = key === 'All' ? tasks.length : counts[key];
          const isActive = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                isActive
                  ? active
                  : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400 hover:text-gray-600'
              }`}
            >
              {label}
              {count > 0 && (
                <span
                  className={`text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                    isActive ? 'bg-white/25' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Task list */}
      <div className="space-y-3">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-300">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <RefreshCw size={28} strokeWidth={1} className="opacity-50" />
            </div>
            <p className="font-serif text-base text-gray-400">No tasks in this category</p>
            <p className="text-sm font-sans text-gray-300 mt-1">New tasks will appear here automatically</p>
          </div>
        ) : (
          sorted.map((task) => <TaskCard key={task.id} task={task} onViewClient={onViewClient} />)
        )}
      </div>
    </div>
  );
};

export default TaskQueue;
