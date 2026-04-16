const STATUS_CONFIG = {
  Pending: {
    bg:     'bg-rose-50',
    text:   'text-rose-600',
    border: 'border-rose-200',
    dot:    'bg-rose-400',
  },
  Assigned: {
    bg:     'bg-teal-50',
    text:   'text-teal-700',
    border: 'border-teal-200',
    dot:    'bg-teal-400',
  },
  Active: {
    bg:     'bg-indigo-50',
    text:   'text-indigo-600',
    border: 'border-indigo-200',
    dot:    'bg-indigo-500',
  },
  Completed: {
    bg:     'bg-emerald-50',
    text:   'text-emerald-600',
    border: 'border-emerald-200',
    dot:    'bg-emerald-500',
  },
  Flagged: {
    bg:     'bg-amber-50',
    text:   'text-amber-700',
    border: 'border-amber-200',
    dot:    'bg-amber-400',
  },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-sans font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
};

export default StatusBadge;
