import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  Monitor, MessageSquare, Send, Sparkles, Wifi, Radio,
} from 'lucide-react';

// ── Keyword → AI query mapping ────────────────────────────────────────────────
const LISTEN_RULES = [
  { patterns: ['gala', 'evening', 'dinner', 'cocktail', 'formal night', 'event'],  query: 'luxury exclusive' },
  { patterns: ['accessor', 'handbag', 'bag', 'scarf', 'belt', 'jewel'],            query: 'accessories' },
  { patterns: ['coat', 'jacket', 'outerwear', 'cold', 'winter'],                   query: 'outerwear coat' },
  { patterns: ['cashmere', 'knitwear', 'sweater', 'cosy', 'jumper', 'warm knit'],  query: 'knitwear cashmere' },
  { patterns: ['blazer', 'tailored', 'suit', 'trouser', 'office', 'interview'],    query: 'tailoring blazer' },
  { patterns: ['gift', 'present', 'birthday', 'anniversary'],                      query: 'gift ideas' },
  { patterns: ['new arrival', 'latest', 'just arrived', 'fresh', 'this season'],   query: 'new arrivals' },
  { patterns: ['budget', 'affordable', 'under £', 'less expensive', 'cheaper'],    query: 'budget affordable' },
  { patterns: ['luxury', 'exclusive', 'high end', 'premium', 'special piece'],     query: 'luxury exclusive' },
  { patterns: ['casual', 'relaxed', 'weekend', 'everyday', 'day off'],             query: 'casual relaxed' },
  { patterns: ['complete', 'outfit', 'pair with', 'match', 'coordinate'],          query: 'complete the look' },
  { patterns: ['fabric', 'material', 'quality', 'detail'],                         query: 'new arrivals' },
  { patterns: ['colour', 'color', 'shade', 'tone', 'style'],                       query: 'complete the look' },
  { patterns: ['size', 'my size', 'available', 'in stock'],                        query: 'complete the look' },
];

const detectProductQuery = (text) => {
  const lower = text.toLowerCase();
  for (const rule of LISTEN_RULES) {
    if (rule.patterns.some((p) => lower.includes(p))) return rule.query;
  }
  return null;
};

// ── CSS keyframes injected once ───────────────────────────────────────────────
const SESSION_STYLES = `
  @keyframes audioBars {
    0%,100% { height: 3px;  }
    50%      { height: 13px; }
  }
  @keyframes speakRing {
    0%,100% { opacity: 0.55; }
    50%      { opacity: 1;    }
  }
  @keyframes fadeUp {
    0%   { opacity: 0; transform: translateY(10px); }
    12%  { opacity: 1; transform: translateY(0);    }
    78%  { opacity: 1; transform: translateY(0);    }
    100% { opacity: 0; transform: translateY(-6px); }
  }
  @keyframes subtleZoom {
    0%,100% { transform: scale(1);    }
    50%      { transform: scale(1.03); }
  }
`;

// ── Audio wave bars ───────────────────────────────────────────────────────────
const AudioWave = ({ color = '#34d399' }) => (
  <div className="flex items-end gap-[2px] h-3.5 px-0.5">
    {[0, 0.12, 0.06, 0.18, 0.09].map((delay, i) => (
      <div
        key={i}
        style={{
          width: 3,
          background: color,
          borderRadius: 2,
          animation: `audioBars 0.55s ease-in-out infinite`,
          animationDelay: `${delay}s`,
          minHeight: 3,
        }}
      />
    ))}
  </div>
);

// ── Network signal bars ───────────────────────────────────────────────────────
const NetworkBars = ({ bars = 4 }) => (
  <div className="flex items-end gap-[2px] h-3">
    {[1, 2, 3, 4].map((i) => (
      <div
        key={i}
        className={`w-[3px] rounded-sm ${i <= bars ? 'bg-green-400' : 'bg-white/20'}`}
        style={{ height: `${i * 25}%` }}
      />
    ))}
  </div>
);

// ── Local webcam tile (real camera feed) ──────────────────────────────────────
const LiveVideoTile = ({
  name, initials = '??', isMuted = false, cameraOff = false,
  isSpeaking = false, networkBars = 4, stream,
  mirror = false, isLocal = false, accent = 'indigo', isLiveBadge = false,
}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream ?? null;
    }
  }, [stream]);

  const isIndigo = accent === 'indigo';
  const ringColor = isIndigo ? 'rgba(129,140,248,0.85)' : 'rgba(52,211,153,0.85)';
  const waveColor = isIndigo ? '#818cf8' : '#34d399';
  const avatarBg  = isIndigo ? 'bg-indigo-700' : 'bg-teal-700';

  return (
    <div className="relative h-full w-full rounded-2xl overflow-hidden bg-slate-800 shadow-2xl">
      {cameraOff || !stream ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-serif text-white select-none ${avatarBg}`}>
            {initials}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-slate-900/80 to-transparent" />
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={mirror ? { transform: 'scaleX(-1)' } : undefined}
        />
      )}

      {/* Speaking ring */}
      {isSpeaking && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ boxShadow: `inset 0 0 0 3px ${ringColor}`, animation: 'speakRing 0.9s ease-in-out infinite' }}
        />
      )}

      {/* Live badge (remote tile) */}
      {isLiveBadge && (
        <div className="absolute top-3 right-3">
          <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Live
          </span>
        </div>
      )}

      {/* Network quality (local tile) */}
      {isLocal && (
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/40 backdrop-blur-sm px-1.5 py-1 rounded-lg">
          <NetworkBars bars={networkBars} />
        </div>
      )}

      {/* Name + audio wave */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <span className="text-white/90 text-xs font-semibold bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full">
          {isLocal ? `${name} (You)` : name}
        </span>
        {isSpeaking && !isMuted && <AudioWave color={waveColor} />}
        {isMuted && <MicOff size={11} className="text-red-400" />}
      </div>
    </div>
  );
};


// ── Control bar ───────────────────────────────────────────────────────────────
const ControlBar = ({ muted, cameraOff, chatOpen, elapsed, onToggleMute, onToggleCamera, onToggleChat, onEndCall }) => {
  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const btn = (active, danger) =>
    `flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-xl transition-all text-xs font-sans shrink-0 ${
      danger
        ? 'bg-red-500 text-white hover:bg-red-600'
        : active
        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
        : 'bg-white/10 text-white/80 hover:bg-white/20'
    }`;

  return (
    <div className="flex items-center justify-center gap-2 py-3 px-6 bg-slate-900 border-t border-white/5">
      {/* Session timer */}
      <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 mr-2">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-white/60 text-xs font-mono tracking-wider">{formatTime(elapsed)}</span>
      </div>

      <button onClick={onToggleMute} className={btn(muted, false)}>
        {muted ? <MicOff size={18} /> : <Mic size={18} />}
        <span>{muted ? 'Unmute' : 'Mute'}</span>
      </button>

      <button onClick={onToggleCamera} className={btn(cameraOff, false)}>
        {cameraOff ? <VideoOff size={18} /> : <Video size={18} />}
        <span>Camera</span>
      </button>

      <button className={btn(false, false)}>
        <Monitor size={18} />
        <span>Share</span>
      </button>

      <button
        onClick={onToggleChat}
        className={`flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-xl transition-all text-xs font-sans shrink-0 ${
          chatOpen ? 'bg-violet-500/30 text-violet-300' : 'bg-white/10 text-white/80 hover:bg-white/20'
        }`}
      >
        <MessageSquare size={18} />
        <span>Chat</span>
      </button>

      <div className="w-px h-8 bg-white/10 mx-1 shrink-0" />

      <button onClick={onEndCall} className={btn(false, true)}>
        <PhoneOff size={18} />
        <span>End</span>
      </button>
    </div>
  );
};

// ── Chat panel ────────────────────────────────────────────────────────────────
const SEED_MESSAGES = [
  { id: 1, sender: 'system',   text: 'Session started',                                                                                  time: '' },
  { id: 2, sender: 'customer', text: "Hi! I'm looking for something special for an upcoming gala.",                                       time: '2:01 PM' },
  { id: 3, sender: 'stylist',  text: "Welcome! I'd love to help. Do you have a colour palette in mind?",                                  time: '2:02 PM' },
  { id: 4, sender: 'customer', text: 'I was thinking navy or deep burgundy — elegant but not too formal.',                                time: '2:03 PM' },
  { id: 5, sender: 'stylist',  text: "Wonderful choices. I'm pulling some pieces now — have a look at the AI suggestions on the left.",   time: '2:04 PM' },
];

const CUSTOMER_REPLIES = [
  "That looks stunning! Do you have it in my size?",
  "I love the fabric on that one — can you tell me more?",
  "Perfect suggestion! What would you pair with it?",
  "Can I see more options in that colour family?",
  "That's exactly what I had in mind — add it to my bag!",
  "How quickly can this be delivered?",
  "Could you show me something a bit more understated?",
];

const ChatPanel = ({ customerName, onClose, onCustomerMessage, injectMessage, onInjectConsumed }) => {
  const [messages, setMessages] = useState(SEED_MESSAGES);
  const [input, setInput]       = useState('');
  const [typing, setTyping]     = useState(false);
  const bottomRef = useRef(null);

  // Inject a stylist message from the AI panel Share button
  useEffect(() => {
    if (!injectMessage) return;
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { id: Date.now(), sender: 'stylist', text: injectMessage, time: now }]);
    onInjectConsumed?.();
  }, [injectMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const send = useCallback(() => {
    if (!input.trim()) return;
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { id: Date.now(), sender: 'stylist', text: input.trim(), time: now }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const now2 = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const replyText = CUSTOMER_REPLIES[Math.floor(Math.random() * CUSTOMER_REPLIES.length)];
      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, sender: 'customer', text: replyText, time: now2 },
      ]);
      onCustomerMessage?.(replyText);
    }, 1200 + Math.random() * 1400);
  }, [input, onCustomerMessage]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-violet-500" />
          <p className="text-sm font-semibold text-slate-900 font-sans">Session Chat</p>
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-indigo-600 text-xs font-semibold transition-colors">
          Hide
        </button>
      </div>

      {/* Participant bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-50 bg-gray-50/60 shrink-0">
        <div className="flex -space-x-1.5">
          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-bold ring-1 ring-white">Y</div>
          <div className="w-5 h-5 rounded-full bg-teal-600 text-white text-[9px] flex items-center justify-center font-bold ring-1 ring-white">
            {customerName[0]}
          </div>
        </div>
        <p className="text-[10px] text-gray-400 font-sans uppercase tracking-wider">You &amp; {customerName}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => {
          if (msg.sender === 'system') {
            return (
              <div key={msg.id} className="flex items-center gap-2 py-1">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[10px] text-gray-400 font-sans uppercase tracking-wider whitespace-nowrap">{msg.text}</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
            );
          }
          return (
            <div key={msg.id} className={`flex flex-col ${msg.sender === 'stylist' ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 ${
                  msg.sender === 'stylist'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-sm'
                    : 'bg-white text-slate-900 shadow-sm border border-gray-100 rounded-bl-sm'
                }`}
              >
                <p className="text-[13px] font-sans leading-relaxed">{msg.text}</p>
              </div>
              <span className="text-[10px] text-gray-400 font-sans mt-0.5 px-1">
                {msg.sender === 'stylist' ? 'You' : customerName} · {msg.time}
              </span>
            </div>
          );
        })}

        {typing && (
          <div className="flex items-start">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.15s' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-100 bg-white shrink-0">
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 px-3 py-1.5">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Message customer…"
            className="flex-1 bg-transparent text-sm font-sans text-slate-900 placeholder-gray-400 outline-none"
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            className="p-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:from-indigo-700 hover:to-purple-700 transition-colors"
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main 3-panel Teams-like layout ────────────────────────────────────────────
const LiveSessionLayout = ({
  aiPane,
  customerName     = 'Customer',
  customerInitials = 'CU',
  stylistName      = 'Stylist',
  onEndCall,
  onAutoQuery,
  injectMessage    = null,
  onInjectConsumed,
}) => {
  const [aiOpen, setAiOpen]             = useState(true);
  const [chatOpen, setChatOpen]         = useState(true);
  const [muted, setMuted]               = useState(false);
  const [cameraOff, setCameraOff]       = useState(false);
  const [speaking, setSpeaking]         = useState(null);
  const [elapsed, setElapsed]           = useState(0);
  const [joinNote, setJoinNote]         = useState(true);
  const [listeningActive, setListening] = useState(false);  // keyword detected pulse
  const [webcamStream, setWebcamStream]       = useState(null);
  const [customerStream, setCustomerStream]   = useState(null);
  const streamRef         = useRef(null);
  const customerStreamRef = useRef(null);

  // Request webcams on mount — try a second device for the customer tile
  useEffect(() => {
    const setup = async () => {
      try {
        const stylistStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = stylistStream;
        setWebcamStream(stylistStream);

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        const constraints = videoDevices.length > 1
          ? { video: { deviceId: { exact: videoDevices[1].deviceId } }, audio: false }
          : { video: true, audio: false };

        const custStream = await navigator.mediaDevices.getUserMedia(constraints);
        customerStreamRef.current = custStream;
        setCustomerStream(custStream);
      } catch (err) {
        console.warn('Webcam unavailable:', err);
      }
    };
    setup();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      customerStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Toggle stylist video track without stopping the stream
  useEffect(() => {
    streamRef.current?.getVideoTracks().forEach(t => { t.enabled = !cameraOff; });
  }, [cameraOff]);

  // Auto-open chat and forward injected messages from the AI panel
  useEffect(() => {
    if (injectMessage) setChatOpen(true);
  }, [injectMessage]);

  const handleCustomerMessage = useCallback((text) => {
    const query = detectProductQuery(text);
    if (!query) return;
    onAutoQuery?.(query);
    setAiOpen(true);          // open AI panel automatically
    setListening(true);
    setTimeout(() => setListening(false), 3500);
  }, [onAutoQuery]);

  // ── Session timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Hide join notification after 4 s ──────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setJoinNote(false), 4200);
    return () => clearTimeout(t);
  }, []);

  // ── Speaking simulation — randomised turns ─────────────────────────────────
  useEffect(() => {
    let speakTimer, pauseTimer;

    const nextTurn = () => {
      const who = Math.random() > 0.45 ? 'customer' : 'stylist';
      setSpeaking(who);
      speakTimer = setTimeout(() => {
        setSpeaking(null);
        // pause between 0.8 – 3 s before next turn
        pauseTimer = setTimeout(nextTurn, 800 + Math.random() * 2200);
      }, 2000 + Math.random() * 4500);
    };

    // Start after 1.2 s so the UI has settled
    pauseTimer = setTimeout(nextTurn, 1200);

    return () => {
      clearTimeout(speakTimer);
      clearTimeout(pauseTimer);
    };
  }, []);

  return (
    <>
      {/* Inject custom keyframes once */}
      <style>{SESSION_STYLES}</style>

      <div className="flex h-full bg-slate-900 overflow-hidden">

        {/* ── Left: AI Stylist toggle strip ────────────────────────────── */}
        {!aiOpen && (
          <button
            onClick={() => setAiOpen(true)}
            className={`shrink-0 flex flex-col items-center justify-center gap-2 w-10 border-r transition-colors ${
              listeningActive
                ? 'bg-violet-600/30 border-violet-400/40 animate-pulse'
                : 'bg-violet-600/12 border-violet-500/15 hover:bg-violet-600/22'
            }`}
          >
            {listeningActive
              ? <Radio size={13} className="text-violet-300 animate-pulse" />
              : <Sparkles size={13} className="text-violet-400" />
            }
            <span
              className={`text-[10px] font-bold uppercase tracking-widest font-sans ${listeningActive ? 'text-violet-300' : 'text-violet-400'}`}
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              {listeningActive ? 'Detected' : 'AI Stylist'}
            </span>
          </button>
        )}

        {/* ── Left: AI Stylist panel ───────────────────────────────────── */}
        <div
          className={`shrink-0 transition-all duration-300 ease-in-out overflow-hidden border-r border-white/5 ${
            aiOpen ? 'w-80' : 'w-0'
          }`}
        >
          <div className="w-80 h-full flex flex-col bg-white">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-violet-500" />
                <p className="text-sm font-semibold text-slate-900 font-sans">AI Stylist</p>
              </div>
              <button
                onClick={() => setAiOpen(false)}
                className="text-gray-400 hover:text-indigo-600 text-xs font-semibold transition-colors"
              >
                Hide
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">{aiPane}</div>
          </div>
        </div>

        {/* ── Centre: video + controls ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Video area */}
          <div className="flex-1 relative p-3 min-h-0">

            {/* Main tile — customer (full) */}
            <div className="h-full w-full">
              <LiveVideoTile
                name={customerName}
                initials={customerInitials}
                accent="teal"
                isSpeaking={speaking === 'customer'}
                networkBars={4}
                stream={customerStream}
                isLiveBadge
              />
            </div>

            {/* PiP — stylist (bottom-right) */}
            <div className="absolute bottom-7 right-7 w-44 h-32 rounded-xl overflow-hidden shadow-2xl ring-2 ring-white/10">
              <LiveVideoTile
                name={stylistName}
                initials="YU"
                accent="indigo"
                isMuted={muted}
                cameraOff={cameraOff}
                isSpeaking={speaking === 'stylist' && !muted}
                networkBars={4}
                stream={webcamStream}
                mirror
                isLocal
              />
            </div>

            {/* Participant count */}
            <div className="absolute top-7 left-7 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm text-white/75 text-xs font-sans px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              2 participants
            </div>

            {/* Network indicator (top-right corner of main tile area) */}
            <div className="absolute top-7 right-56 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-lg">
              <Wifi size={11} className="text-green-400" />
              <span className="text-[10px] text-white/60 font-sans">HD · 1080p</span>
            </div>

            {/* Join notification toast */}
            {joinNote && (
              <div
                className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm text-white text-xs font-sans px-3 py-1.5 rounded-full shadow-lg pointer-events-none"
                style={{ animation: 'fadeUp 4.2s ease-in-out forwards' }}
              >
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                {customerName} joined the session
              </div>
            )}
          </div>

          {/* Control bar */}
          <ControlBar
            muted={muted}
            cameraOff={cameraOff}
            chatOpen={chatOpen}
            elapsed={elapsed}
            onToggleMute={() => setMuted(v => !v)}
            onToggleCamera={() => setCameraOff(v => !v)}
            onToggleChat={() => setChatOpen(v => !v)}
            onEndCall={onEndCall}
          />
        </div>

        {/* ── Right: Chat panel ──────────────────────────────────────────── */}
        <div
          className={`shrink-0 transition-all duration-300 ease-in-out overflow-hidden border-l border-white/5 ${
            chatOpen ? 'w-80' : 'w-0'
          }`}
        >
          <div className="w-80 h-full">
            <ChatPanel
              customerName={customerName}
              onClose={() => setChatOpen(false)}
              onCustomerMessage={handleCustomerMessage}
              injectMessage={injectMessage}
              onInjectConsumed={onInjectConsumed}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default LiveSessionLayout;
