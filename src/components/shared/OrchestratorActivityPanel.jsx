import { useState } from 'react';
import { Activity, ChevronDown, ChevronUp, Wifi, WifiOff, Loader2, AlertCircle, CheckCircle2, Clock, Zap } from 'lucide-react';
import useAssignmentStore from '../../store/useAssignmentStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AGENT_COLORS = {
  task_assignment:       'bg-indigo-100 text-indigo-800 border-indigo-300',
  customer_intelligence: 'bg-violet-100 text-violetigo-800 border-violet-300',
  cart_builder:          'bg-emerald-100 text-emerald-800 border-emerald-300',
  audit_analysis:        'bg-amber-100  text-amber-800  border-amber-300',
};

const AGENT_LABELS = {
  task_assignment:       'Task Assignment',
  customer_intelligence: 'Customer Intel',
  cart_builder:          'Cart Builder',
  audit_analysis:        'Audit Analysis',
};

function agentBadge(agentKey) {
  const color = AGENT_COLORS[agentKey] || 'bg-slate-100 text-slate-700 border-slate-300';
  const label = AGENT_LABELS[agentKey] || agentKey;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      {label}
    </span>
  );
}

function formatTs(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '';
  }
}

function LatencyPill({ ms, label }) {
  if (ms == null) return null;
  const color = ms < 500 ? 'text-emerald-600' : ms < 2000 ? 'text-amber-600' : 'text-red-600';
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-mono ${color}`}>
      <Clock size={10} />
      {label && <span className="text-slate-400 mr-0.5">{label}</span>}
      {ms}ms
    </span>
  );
}

// ─── Last Decision Card ────────────────────────────────────────────────────────

function LastDecisionCard({ decision }) {
  if (!decision) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
        <Activity size={14} />
        No routing decisions yet — trigger an agent action to see activity.
      </div>
    );
  }

  const { routedAgent, routeReason, routeMs, execMs, totalMs, mode, error, intent, source, timestamp } = decision;

  return (
    <div className={`rounded-xl border p-4 ${error ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {error ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 border border-red-300 px-2 py-0.5 rounded-full">
            <AlertCircle size={10} /> Error
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
            <CheckCircle2 size={10} /> Routed
          </span>
        )}
        {routedAgent && agentBadge(routedAgent)}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
          mode === 'remote'
            ? 'bg-green-100 text-green-800 border-green-300'
            : 'bg-amber-100 text-amber-800 border-amber-300'
        }`}>
          {mode === 'remote' ? <><Wifi size={10} /> Remote AI</> : <><WifiOff size={10} /> Local Fallback</>}
        </span>
        <span className="ml-auto text-xs text-slate-400">{formatTs(timestamp)}</span>
      </div>

      {/* Intent */}
      {intent && (
        <p className="text-xs text-slate-500 mb-1 truncate">
          <span className="font-semibold text-slate-600">Intent:</span> {intent}
        </p>
      )}

      {/* Route reason */}
      {routeReason && (
        <p className="text-xs text-slate-500 mb-2">
          <span className="font-semibold text-slate-600">Reason:</span> {routeReason}
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-700 font-medium mb-2">{error}</p>
      )}

      {/* Latencies */}
      <div className="flex flex-wrap gap-3">
        <LatencyPill ms={routeMs} label="route" />
        <LatencyPill ms={execMs} label="exec" />
        <LatencyPill ms={totalMs} label="total" />
        {source && source !== 'unknown' && (
          <span className="text-xs text-slate-400">from <span className="font-medium text-slate-600">{source}</span></span>
        )}
      </div>
    </div>
  );
}

// ─── History Row ───────────────────────────────────────────────────────────────

function HistoryRow({ decision, idx }) {
  const { routedAgent, totalMs, mode, error, timestamp, source } = decision;
  return (
    <div className={`flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs
      ${idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}
      ${error ? 'border-l-2 border-red-400' : 'border-l-2 border-emerald-400'}
    `}>
      <span className="text-slate-400 w-16 shrink-0">{formatTs(timestamp)}</span>
      {routedAgent ? agentBadge(routedAgent) : <span className="text-slate-400">—</span>}
      {totalMs != null && (
        <span className={`font-mono ${totalMs < 500 ? 'text-emerald-600' : totalMs < 2000 ? 'text-amber-600' : 'text-red-600'}`}>
          {totalMs}ms
        </span>
      )}
      <span className={`ml-auto ${mode === 'remote' ? 'text-green-600' : 'text-amber-600'}`}>
        {mode === 'remote' ? <Wifi size={10} /> : <WifiOff size={10} />}
      </span>
      {error && <AlertCircle size={10} className="text-red-500" />}
      {source && source !== 'unknown' && (
        <span className="text-slate-400 hidden sm:inline">{source}</span>
      )}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export default function OrchestratorActivityPanel() {
  const [expanded, setExpanded] = useState(false);

  const isThinking = useAssignmentStore((s) => s.agentState?.isThinking || false);
  const routingHistory = useAssignmentStore((s) => s.agentState?.routingHistory || []);
  const lastError = useAssignmentStore((s) => s.agentState?.lastError || null);

  const lastDecision = routingHistory[0] ?? null;
  const historyTail = routingHistory.slice(1, 6);

  const totalRoutes = routingHistory.length;
  const errorCount = routingHistory.filter((d) => d.error).length;
  const remoteCount = routingHistory.filter((d) => d.mode === 'remote').length;
  const avgTotal = totalRoutes
    ? Math.round(routingHistory.reduce((s, d) => s + (d.totalMs || 0), 0) / totalRoutes)
    : null;

  return (
    <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-purple-50 shadow-sm overflow-hidden">
      {/* ── Header / Summary Bar ── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-indigo-50/60 transition-colors"
      >
        {/* Status icon */}
        <div className="shrink-0">
          {isThinking ? (
            <Loader2 size={18} className="text-indigo-600 animate-spin" />
          ) : lastError ? (
            <AlertCircle size={18} className="text-red-500" />
          ) : (
            <Zap size={18} className="text-indigo-500" />
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="font-semibold text-slate-800 text-sm">Orchestrator Activity</span>

          {isThinking && (
            <span className="text-xs text-indigo-600 font-medium animate-pulse">Routing…</span>
          )}

          {!isThinking && lastDecision && (
            <>
              {agentBadge(lastDecision.routedAgent)}
              <span className="text-xs text-slate-400 hidden sm:inline truncate max-w-[200px]">
                {lastDecision.intent}
              </span>
            </>
          )}
        </div>

        {/* Right side stats */}
        <div className="flex items-center gap-3 shrink-0">
          {totalRoutes > 0 && (
            <>
              <span className="text-xs text-slate-500 hidden md:inline">
                {totalRoutes} route{totalRoutes !== 1 ? 's' : ''}
              </span>
              {avgTotal != null && (
                <span className="text-xs font-mono text-slate-500 hidden md:inline">avg {avgTotal}ms</span>
              )}
              {errorCount > 0 && (
                <span className="text-xs font-semibold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">
                  {errorCount} err
                </span>
              )}
              <span className="text-xs text-slate-400 hidden sm:inline">
                {remoteCount}/{totalRoutes} remote
              </span>
            </>
          )}
          {expanded ? (
            <ChevronUp size={14} className="text-slate-400" />
          ) : (
            <ChevronDown size={14} className="text-slate-400" />
          )}
        </div>
      </button>

      {/* ── Expanded Detail ── */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-indigo-100">
          {/* Stats row */}
          {totalRoutes > 0 && (
            <div className="flex flex-wrap gap-4 pt-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-700">{totalRoutes}</p>
                <p className="text-xs text-slate-500">Total Routes</p>
              </div>
              {avgTotal != null && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-violet-700">{avgTotal}ms</p>
                  <p className="text-xs text-slate-500">Avg Latency</p>
                </div>
              )}
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-700">{remoteCount}</p>
                <p className="text-xs text-slate-500">Remote</p>
              </div>
              {errorCount > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{errorCount}</p>
                  <p className="text-xs text-slate-500">Errors</p>
                </div>
              )}
            </div>
          )}

          {/* Last decision */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Last Decision</h4>
            <LastDecisionCard decision={lastDecision} />
          </div>

          {/* History */}
          {historyTail.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Recent History</h4>
              <div className="space-y-0.5">
                {historyTail.map((d, i) => (
                  <HistoryRow key={d.id || i} decision={d} idx={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
