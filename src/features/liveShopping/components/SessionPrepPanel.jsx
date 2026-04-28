import { useEffect, useState } from 'react';
import { ChevronRight, MessageSquare, Package, Radio, Sparkles, Target, Users, Zap } from 'lucide-react';
import { getSessionPrep } from '../../../agents/sessionPrepAgent';

const TIER_STYLES = {
  Platinum: 'text-violet-300 border-violet-500/30 bg-violet-500/10',
  Gold:     'text-amber-300 border-amber-500/30 bg-amber-500/10',
  Silver:   'text-slate-300 border-slate-400/30 bg-slate-500/10',
  Bronze:   'text-orange-300 border-orange-500/30 bg-orange-500/10',
};

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded bg-white/10 ${className}`} />;
}

export default function SessionPrepPanel({ customer, task, products, onReady }) {
  const [prep, setPrep] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getSessionPrep({ customer, task, products })
      .then(setPrep)
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tierStyle = TIER_STYLES[customer?.tier] ?? TIER_STYLES.Silver;

  return (
    <div className="h-full flex flex-col bg-slate-900 text-white overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={14} className="text-indigo-400" />
          <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-widest font-sans">
            AI Session Prep
          </span>
        </div>
        <h1 className="text-2xl font-serif font-light text-white">Prepare Your Session</h1>
        <p className="text-xs text-white/40 font-sans mt-1">
          {loading ? 'Generating AI briefing…' : 'AI briefing ready — review before going live'}
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/10 h-full">

          {/* ── Left: Customer card ─────────────────────────────────────── */}
          <div className="p-6 space-y-5 overflow-y-auto">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 font-sans">
              Client Profile
            </p>

            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-xl font-serif text-white/60 shrink-0">
                {customer?.initials || 'CU'}
              </div>
              <div>
                <p className="text-lg font-serif text-white leading-tight">{customer?.name || 'Guest'}</p>
                <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border mt-1.5 font-sans ${tierStyle}`}>
                  {customer?.tier || 'Silver'} Member
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: 'Lifetime Value', value: customer?.ltv ? `$${customer.ltv.toLocaleString()}` : '—' },
                { label: 'Visits',         value: customer?.visitCount ?? '—' },
                { label: 'Points',         value: customer?.loyaltyPoints?.toLocaleString() ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/5 border border-white/8 rounded-xl p-3 text-center">
                  <p className="text-base font-semibold text-white font-sans">{value}</p>
                  <p className="text-[10px] text-white/40 font-sans mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Preferences */}
            {customer?.preferences && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 font-sans">
                  Preferences
                </p>
                {customer.preferences.colors?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {customer.preferences.colors.map((c) => (
                      <span
                        key={c}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/55 font-sans"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
                {customer.preferences.categories?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {customer.preferences.categories.map((c) => (
                      <span
                        key={c}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-sans"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
                {customer.preferences.notes && (
                  <p className="text-xs text-white/45 italic font-sans">"{customer.preferences.notes}"</p>
                )}
              </div>
            )}

            {/* Task */}
            {task && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 font-sans mb-2">
                  Session Task
                </p>
                <p className="text-sm text-white/85 font-sans leading-snug">{task.item}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {task.type && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 font-sans">
                      {task.type}
                    </span>
                  )}
                  {task.urgency && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/20 font-sans">
                      {task.urgency}
                    </span>
                  )}
                  {task.location && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/8 text-white/40 border border-white/10 font-sans">
                      {task.location}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: AI briefing ──────────────────────────────────────── */}
          <div className="p-6 space-y-5 overflow-y-auto">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 font-sans">
              AI Briefing
            </p>

            {/* Session goal */}
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/8 p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <Target size={12} className="text-indigo-400" />
                <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider font-sans">
                  Session Goal
                </span>
              </div>
              {loading
                ? <Skeleton className="h-4 w-full" />
                : <p className="text-sm text-white/80 font-sans leading-relaxed">{prep?.sessionGoal}</p>}
            </div>

            {/* Customer insight */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <Users size={12} className="text-emerald-400" />
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider font-sans">
                  Customer Insight
                </span>
              </div>
              {loading ? (
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ) : (
                <p className="text-sm text-white/70 font-sans leading-relaxed">{prep?.customerInsight}</p>
              )}
            </div>

            {/* Talking points */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={12} className="text-amber-400" />
                <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider font-sans">
                  Talking Points
                </span>
              </div>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-3 w-full" />)}
                </div>
              ) : (
                <ul className="space-y-2">
                  {prep?.talkingPoints?.map((pt, i) => (
                    <li key={i} className="flex gap-2 text-sm text-white/65 font-sans leading-snug">
                      <ChevronRight size={13} className="text-amber-400/60 shrink-0 mt-0.5" />
                      {pt}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Product focus */}
            {(loading || prep?.productFocus?.length > 0) && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Package size={12} className="text-rose-400" />
                  <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider font-sans">
                    Product Focus
                  </span>
                </div>
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {prep?.productFocus?.map((p, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/8 p-3"
                      >
                        <div className="w-7 h-7 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-300 text-xs font-bold font-sans shrink-0">
                          {i + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-sans font-medium text-white/80 truncate">{p.name}</p>
                          <p className="text-[11px] text-white/40 font-sans mt-0.5 leading-snug">{p.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Icebreakers */}
            {(loading || prep?.icebreakers?.length > 0) && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={12} className="text-sky-400" />
                  <span className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider font-sans">
                    Icebreakers
                  </span>
                </div>
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => <Skeleton key={i} className="h-10 rounded-xl" />)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {prep?.icebreakers?.map((line, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-sky-500/15 bg-sky-500/8 px-4 py-3"
                      >
                        <p className="text-xs text-white/60 font-sans italic leading-relaxed">"{line}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="shrink-0 px-6 py-4 border-t border-white/10 flex items-center justify-between">
        <p className="text-xs text-white/30 font-sans">
          {loading ? 'AI is preparing your briefing…' : 'Briefing complete'}
        </p>
        <button
          onClick={onReady}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-wait transition-colors text-sm font-semibold font-sans"
        >
          <Radio size={13} className="text-red-400 animate-pulse" />
          Start Live Session
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
