import { useEffect } from 'react';
import { Bell, User, X, CheckCircle } from 'lucide-react';
import useAppStore from '../../store/useAppStore';

// task_assigned → green (positive, associate needs to act)
// new_task      → charcoal (informational queue update)
const TYPE_STYLE = {
  task_assigned: { bg: 'bg-green-700', iconBg: 'bg-green-500/30', Icon: User,  iconCls: 'text-green-200', tag: 'New Assignment' },
  new_task:      { bg: 'bg-slate-900',  iconBg: 'bg-amber-400/20',      Icon: Bell,  iconCls: 'text-amber-400',       tag: null },
};

const NotificationToast = () => {
  const { notifications, dismissNotification } = useAppStore();
  const latest = notifications[0];

  useEffect(() => {
    if (!latest) return;
    const timer = setTimeout(() => dismissNotification(latest.id), 5000);
    return () => clearTimeout(timer);
  }, [latest?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!latest) return null;

  const s = TYPE_STYLE[latest.type] ?? TYPE_STYLE.new_task;
  const { Icon } = s;

  return (
    <div className="fixed top-4 right-4 z-[200] animate-in max-w-xs w-full">
      <div className={`${s.bg} text-white rounded-xl shadow-2xl p-4 flex items-start gap-3`}>
        <div className={`w-8 h-8 ${s.iconBg} rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <Icon size={15} className={s.iconCls} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-sans font-semibold text-white leading-snug">{latest.message}</p>
          {latest.detail && (
            <p className="text-[10px] text-white/60 font-sans mt-0.5 line-clamp-2">{latest.detail}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[10px] text-white/30 font-sans">
              {notifications.length > 1 ? `+${notifications.length - 1} more` : 'just now'}
            </p>
            {s.tag && (
              <span className="flex items-center gap-0.5 text-[9px] text-green-300 font-bold uppercase tracking-wider">
                <CheckCircle size={8} />
                {s.tag}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => dismissNotification(latest.id)}
          className="text-white/30 hover:text-white/70 transition-colors flex-shrink-0 p-0.5"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;
