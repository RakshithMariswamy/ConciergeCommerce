/**
 * NotificationDrawer
 * ──────────────────
 * Slide-in panel showing all notifications.
 * Highlights task_assigned notifications with a green accent so
 * associates can instantly see new assignments from the Team Lead.
 */

import { X, Bell, User, Clipboard, CheckCircle } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import useAssignmentStore from '../../store/useAssignmentStore';

// ─── TYPE CONFIG ──────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  task_assigned: {
    icon: User,
    bg: 'bg-green-50',
    border: 'border-green-200',
    iconBg: 'bg-green-100 text-green-600',
    label: 'Task Assigned',
    labelColor: 'text-green-700',
  },
  new_task: {
    icon: Clipboard,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100 text-blue-600',
    label: 'New Task',
    labelColor: 'text-blue-700',
  },
  default: {
    icon: Bell,
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    iconBg: 'bg-gray-100 text-gray-500',
    label: 'Notification',
    labelColor: 'text-gray-600',
  },
};

const timeAgo = (iso) => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff === 1) return '1 min ago';
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
};

// ─── NOTIFICATION ITEM ────────────────────────────────────────────────────────

const NotificationItem = ({ notification, onDismiss }) => {
  const cfg = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.default;
  const NIcon = cfg.icon;

  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${cfg.bg} ${cfg.border} relative group`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
        <NIcon size={14} strokeWidth={2} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${cfg.labelColor}`}>
            {cfg.label}
          </span>
        </div>
        <p className="text-sm font-sans font-medium text-charcoal leading-snug">
          {notification.message}
        </p>
        {notification.detail && (
          <p className="text-xs text-gray-400 font-sans mt-0.5 line-clamp-2">
            {notification.detail}
          </p>
        )}
        <p className="text-[10px] text-gray-300 font-sans mt-1">
          {timeAgo(notification.timestamp)}
        </p>
      </div>

      <button
        onClick={() => onDismiss(notification.id)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-white/70 transition-all text-gray-400 hover:text-gray-600 shrink-0"
      >
        <X size={12} />
      </button>
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const NotificationDrawer = ({ onClose }) => {
  const notifications = useAppStore((s) => s.notifications);
  const dismissNotification = useAppStore((s) => s.dismissNotification);
  const currentUser = useAssignmentStore((s) => s.currentUser);

  // Separate: my assignments vs general
  const myAssignments = notifications.filter(
    (n) => n.type === 'task_assigned' && n.assigneeId === currentUser.id
  );
  const others = notifications.filter(
    (n) => !(n.type === 'task_assigned' && n.assigneeId === currentUser.id)
  );

  const handleDismissAll = () => {
    notifications.forEach((n) => dismissNotification(n.id));
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-sm z-50 bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-charcoal" />
            <h2 className="font-serif text-lg font-medium text-charcoal">Notifications</h2>
            {notifications.length > 0 && (
              <span className="bg-charcoal text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {notifications.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={handleDismissAll}
                className="text-xs font-sans text-gray-400 hover:text-charcoal transition-colors flex items-center gap-1"
              >
                <CheckCircle size={11} />
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={16} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Bell size={22} strokeWidth={1} className="text-gray-300" />
              </div>
              <p className="font-sans text-sm text-gray-400">All caught up!</p>
              <p className="font-sans text-xs text-gray-300 mt-1">No new notifications</p>
            </div>
          ) : (
            <>
              {/* Task assignments for me */}
              {myAssignments.length > 0 && (
                <div>
                  <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-green-600 mb-2 px-1">
                    Your Assignments
                  </p>
                  <div className="space-y-2">
                    {myAssignments.map((n) => (
                      <NotificationItem
                        key={n.id}
                        notification={n}
                        onDismiss={dismissNotification}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* All other notifications */}
              {others.length > 0 && (
                <div>
                  {myAssignments.length > 0 && (
                    <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">
                      General
                    </p>
                  )}
                  <div className="space-y-2">
                    {others.map((n) => (
                      <NotificationItem
                        key={n.id}
                        notification={n}
                        onDismiss={dismissNotification}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationDrawer;
