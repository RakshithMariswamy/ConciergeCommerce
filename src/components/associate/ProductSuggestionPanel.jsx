/**
 * ProductSuggestionPanel
 * ──────────────────────
 * AI Stylist Chat for pre-session product curation.
 * Associates can get smart, profile-aware recommendations,
 * stage products for the upcoming live session, and add items
 * directly to the client's cart — all before the session starts.
 */

import { useState, useRef, useEffect } from 'react';
import {
  Sparkles, Send, Star, Gift, Tag, Pin, X,
  ShoppingBag, Zap, Package, Shirt, CheckCircle,
  Link, Check, Radio,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../../store/useAppStore';

// ─── CATEGORY PALETTE ─────────────────────────────────────────────────────────

const CAT_STYLE = {
  Tailoring:   { from: 'from-indigo-400',  to: 'to-indigo-600',  label: 'bg-indigo-100 text-indigo-700 border-indigo-200'  },
  Accessories: { from: 'from-amber-400',   to: 'to-amber-600',   label: 'bg-amber-100 text-amber-700 border-amber-200'     },
  Knitwear:    { from: 'from-orange-300',  to: 'to-orange-500',  label: 'bg-orange-100 text-orange-700 border-orange-200'  },
  Outerwear:   { from: 'from-slate-400',   to: 'to-slate-600',   label: 'bg-slate-100 text-slate-700 border-slate-200'     },
  Casualwear:  { from: 'from-teal-400',    to: 'to-teal-600',    label: 'bg-teal-100 text-teal-700 border-teal-200'        },
  Eveningwear: { from: 'from-rose-400',    to: 'to-rose-600',    label: 'bg-rose-100 text-rose-700 border-rose-200'        },
};
const DEFAULT_CAT = { from: 'from-gray-300', to: 'to-gray-500', label: 'bg-gray-100 text-gray-600 border-gray-200' };

// ─── STOCK HELPERS ────────────────────────────────────────────────────────────

const totalStock = (inventory, sku) => {
  const d = inventory[sku];
  if (!d) return 0;
  return Object.values(d).reduce(
    (sum, sizes) => sum + Object.values(sizes).reduce((s, q) => s + q, 0),
    0
  );
};

const stockForSize = (inventory, sku, size) => {
  const d = inventory[sku];
  if (!d) return 0;
  return Object.values(d).reduce((sum, sizes) => sum + (sizes[size] || 0), 0);
};

const AvailBadge = ({ count }) => {
  if (count === 0)
    return (
      <span className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
        Out of Stock
      </span>
    );
  if (count <= 3)
    return (
      <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
        {count} left
      </span>
    );
  return (
    <span className="text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
      In Stock
    </span>
  );
};

// ─── RECOMMENDATION ENGINE ────────────────────────────────────────────────────

const scoreProduct = (product, customer) => {
  let score = 0;
  const { preferences, tier, recentPurchases } = customer;

  if (preferences.categories.includes(product.category)) score += 5;

  const custColors = preferences.colors.map((c) => c.toLowerCase());
  const prodColors = product.colors.map((c) => c.toLowerCase());
  if (prodColors.some((pc) => custColors.some((cc) => pc.includes(cc) || cc.includes(pc))))
    score += 3;

  const recentSkus = recentPurchases.map((p) => p.sku);
  if (recentSkus.includes(product.sku)) score -= 2;

  if (tier === 'Platinum' && product.price > 1000) score += 2;
  if (tier === 'Gold'     && product.price > 500)  score += 1;

  return score;
};

const getRecommendations = (customer, products, maxCount = 4) =>
  [...products]
    .map((p) => ({ ...p, _score: scoreProduct(p, customer) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, maxCount);

// ─── AI RESPONSE RULES ────────────────────────────────────────────────────────

const AI_RULES = [
  {
    keywords: ['accessor', 'bag', 'belt', 'scarf'],
    label: 'Accessories',
    text: (c) => `${c.name.split(' ')[0]} has a great eye for accessories. Here are pieces that will elevate their existing wardrobe:`,
    filter: (products) => products.filter((p) => p.category === 'Accessories'),
  },
  {
    keywords: ['coat', 'outerwear', 'jacket', 'overcoat'],
    label: 'Outerwear',
    text: () => `Our outerwear collection this season is exceptional. These pieces represent strong investment additions:`,
    filter: (products) => products.filter((p) => p.category === 'Outerwear'),
  },
  {
    keywords: ['knit', 'sweater', 'cashmere', 'cosy', 'warm'],
    label: 'Knitwear',
    text: () => `Our knitwear range uses only the finest natural fibres. Here are the standout picks:`,
    filter: (products) => products.filter((p) => p.category === 'Knitwear'),
  },
  {
    keywords: ['tailor', 'blazer', 'trouser', 'formal', 'suit'],
    label: 'Tailoring',
    text: (c) => `${c.name.split(' ')[0]} has strong taste in tailoring. Here are our newest arrivals in that category:`,
    filter: (products) => products.filter((p) => p.category === 'Tailoring'),
  },
  {
    keywords: ['casual', 'relax', 'weekend', 'everyday', 'linen', 'shirt'],
    label: 'Casualwear',
    text: () => `For a relaxed yet elevated look, these pieces work beautifully for everyday wear:`,
    filter: (products) => products.filter((p) => p.category === 'Casualwear'),
  },
  {
    keywords: ['gift', 'present'],
    label: 'Gifts',
    text: (c) => `Perfect gifting choices — here are popular picks in the $200–$500 range, always well-received by ${c.tier} members:`,
    filter: (products) =>
      products.filter((p) => p.price >= 195 && p.price <= 600).slice(0, 2),
  },
  {
    keywords: ['luxury', 'exclusive', 'premium', 'vip', 'special'],
    label: 'Luxury',
    text: (c) => `For our ${c.tier} clients I'd highlight these exceptional investment pieces:`,
    filter: (products) => [...products].sort((a, b) => b.price - a.price).slice(0, 2),
  },
  {
    keywords: ['complete', 'outfit', 'look', 'pair', 'match', 'coordinate'],
    label: 'Complete the Look',
    text: () => `These pieces coordinate beautifully together — perfect for building a complete capsule look:`,
    filter: (products, customer) => getRecommendations(customer, products, 2),
  },
  {
    keywords: ['new', 'arrival', 'latest', 'fresh', 'season', 'recently'],
    label: 'New Arrivals',
    text: () => `Our latest arrivals — these have been generating excellent response from clients in-store:`,
    filter: (products) => products.slice(0, 2),
  },
  {
    keywords: ['under', 'budget', 'affordable', 'less'],
    label: 'Budget-Friendly',
    text: () => `Here are elegant options at a more accessible price point — excellent value without compromise:`,
    filter: (products) =>
      [...products].sort((a, b) => a.price - b.price).slice(0, 2),
  },
];

const getAIResponse = (query, customer, products) => {
  const q = query.toLowerCase();
  for (const rule of AI_RULES) {
    if (rule.keywords.some((kw) => q.includes(kw))) {
      const matched = rule.filter(products, customer).slice(0, 2);
      if (matched.length > 0) {
        return { text: rule.text(customer), products: matched };
      }
    }
  }
  return {
    text: `Based on ${customer.name.split(' ')[0]}'s profile and your query, here are my top suggestions:`,
    products: getRecommendations(customer, products, 2),
  };
};

// ─── CHAT PRODUCT CARD ────────────────────────────────────────────────────────

const ChatProductCard = ({ product, customer, inventory, staged, onStage, onAddToCart, onShareToChat }) => {
  const cs = CAT_STYLE[product.category] ?? DEFAULT_CAT;
  const { preferences } = customer;
  const [copied, setCopied] = useState(false);

  // Most relevant size for this customer
  const sizeMap = preferences.sizes;
  const relevantSize =
    product.sizes?.some((s) => Object.values(sizeMap).includes(s))
      ? Object.values(sizeMap).find((sz) => product.sizes?.includes(sz))
      : null;

  const stock = totalStock(inventory, product.sku);
  const sizeSt = relevantSize ? stockForSize(inventory, product.sku, relevantSize) : null;
  const isPinned = staged.some((s) => s.id === product.id);

  const handleCopyUrl = () => {
    const url = `${window.location.origin}/products/${product.sku}`;
    const msg = `Here's a product I'd like to share with you — ${product.name} ($${product.price.toLocaleString()}): ${url}`;
    onShareToChat?.(msg);
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className={`rounded-xl border overflow-hidden shadow-sm transition-all duration-200 ${
        isPinned
          ? 'border-violet-400 ring-1 ring-violet-200 bg-violet-50/30'
          : 'border-gray-100 bg-white'
      }`}
    >
      {/* Top accent bar */}
      <div className={`h-1 bg-gradient-to-r ${cs.from} ${cs.to}`} />

      <div className="p-3">
        <div className="flex items-start gap-2.5">
          {/* Category icon */}
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cs.from} ${cs.to} flex items-center justify-center flex-shrink-0 shadow-sm`}
          >
            <Package size={16} className="text-white" strokeWidth={1.5} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <p className="font-sans font-semibold text-charcoal text-xs leading-snug">{product.name}</p>
              <p className="font-serif text-sm font-semibold text-charcoal flex-shrink-0 ml-1">
                ${product.price.toLocaleString()}
              </p>
            </div>

            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${cs.label}`}>
                {product.category}
              </span>
              <AvailBadge count={stock} />
              {sizeSt !== null && relevantSize && (
                <span className="text-[9px] text-gray-400 font-sans">
                  Size {relevantSize}: {sizeSt > 0 ? `${sizeSt} avail` : 'unavailable'}
                </span>
              )}
            </div>

            <p className="text-[10px] text-gray-400 font-sans mt-1.5 line-clamp-1 leading-snug">
              {product.material} · {product.origin}
            </p>
          </div>
        </div>

        {/* Colors row */}
        <div className="flex gap-1 mt-2 flex-wrap">
          {product.colors.slice(0, 4).map((color) => (
            <span
              key={color}
              className="text-[9px] font-sans text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full"
            >
              {color}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 mt-2.5">
          <button
            onClick={() => onStage(product)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all active:scale-95 ${
              isPinned
                ? 'bg-violet-100 text-violet-700 border border-violet-300'
                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50'
            }`}
          >
            {isPinned ? <CheckCircle size={10} /> : <Pin size={10} />}
            {isPinned ? 'Staged' : 'Stage'}
          </button>
          <button
            onClick={() => onAddToCart(product)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold bg-charcoal text-white hover:bg-gray-800 active:scale-95 transition-all"
          >
            <ShoppingBag size={10} />
            Add to Cart
          </button>
          <button
            onClick={handleCopyUrl}
            title="Copy product link to share with customer"
            className={`flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-[11px] font-semibold border transition-all active:scale-95 ${
              copied
                ? 'bg-green-50 text-green-600 border-green-200'
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            {copied ? <Check size={10} /> : <Link size={10} />}
            {copied ? 'Copied!' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── CHAT MESSAGE ─────────────────────────────────────────────────────────────

const ChatMessage = ({ msg, customer, inventory, staged, onStage, onAddToCart, onShareToChat }) => {
  const isUser = msg.role === 'user';

  // ── System / session-detected notice ────────────────────────────────────
  if (msg.role === 'system') {
    return (
      <div className="flex items-center gap-2 my-2 mb-3">
        <div className="flex-1 h-px bg-violet-100" />
        <div className="flex items-center gap-1">
          <Radio size={9} className="text-violet-400 animate-pulse" />
          <span className="text-[9px] text-violet-500 font-sans font-medium">{msg.text}</span>
        </div>
        <div className="flex-1 h-px bg-violet-100" />
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'items-start gap-2'} mb-3.5`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md">
          <Sparkles size={12} className="text-white" />
        </div>
      )}

      <div className={isUser ? 'max-w-[75%]' : 'flex-1 min-w-0'}>
        {isUser ? (
          <div className="bg-charcoal text-white text-xs font-sans px-3.5 py-2 rounded-2xl rounded-tr-sm shadow-sm">
            {msg.text}
          </div>
        ) : (
          <>
            {/* Session-detected badge */}
            {msg.source === 'session' && (
              <div className="flex items-center gap-1 mb-1.5">
                <Radio size={9} className="text-violet-500 animate-pulse" />
                <span className="text-[9px] text-violet-600 font-sans font-semibold uppercase tracking-wider">
                  Suggested from session chat
                </span>
              </div>
            )}
            <p className="text-xs text-gray-600 font-sans leading-relaxed mb-2">
              {msg.text.split('**').map((part, i) =>
                i % 2 === 1 ? <strong key={i} className="text-charcoal">{part}</strong> : part
              )}
            </p>
            {msg.products?.length > 0 && (
              <div className="space-y-2">
                {msg.products.map((product) => (
                  <ChatProductCard
                    key={product.id}
                    product={product}
                    customer={customer}
                    inventory={inventory}
                    staged={staged}
                    onStage={onStage}
                    onAddToCart={onAddToCart}
                    onShareToChat={onShareToChat}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ─── TYPING INDICATOR ─────────────────────────────────────────────────────────

const TypingIndicator = () => (
  <div className="flex items-center gap-2 mb-3">
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
      <Sparkles size={12} className="text-white" />
    </div>
    <div className="flex items-center gap-1 bg-gray-100 rounded-2xl px-3 py-2.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </div>
  </div>
);

// ─── SESSION PREP SHELF ───────────────────────────────────────────────────────

const SessionShelf = ({ staged, onRemove, onLaunch, inSession }) => {
  if (staged.length === 0) return null;

  const total = staged.reduce((s, p) => s + p.price, 0);

  return (
    <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-3.5 mb-3">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center">
            <Pin size={10} className="text-white" />
          </div>
          <span className="text-[11px] font-bold text-violet-800 uppercase tracking-wider">
            {inSession ? 'Show to Client' : 'Session Prep'}
          </span>
          <span className="text-[10px] bg-violet-200 text-violet-700 px-1.5 py-0.5 rounded-full font-semibold">
            {staged.length} item{staged.length !== 1 ? 's' : ''} · ${total.toLocaleString()}
          </span>
        </div>
        {!inSession && (
          <button
            onClick={onLaunch}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-[11px] font-bold rounded-lg hover:bg-violet-700 active:scale-95 transition-all shadow-sm"
          >
            <Zap size={10} className="fill-white" />
            Launch Session
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {staged.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-1.5 bg-white border border-violet-200 shadow-sm rounded-full pl-2.5 pr-1.5 py-1"
          >
            <span className="text-[11px] font-semibold text-charcoal font-sans">{item.name}</span>
            <span className="text-[10px] text-violet-500 font-sans">${item.price.toLocaleString()}</span>
            <button
              onClick={() => onRemove(item.id)}
              className="w-3.5 h-3.5 rounded-full bg-gray-100 hover:bg-red-100 flex items-center justify-center transition-colors group"
            >
              <X size={8} className="text-gray-400 group-hover:text-red-500" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── QUICK PROMPTS ─────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  { label: 'Complete the Look', Icon: Shirt,   query: 'complete the look'   },
  { label: 'Accessories',       Icon: Tag,     query: 'accessories'         },
  { label: 'New Arrivals',      Icon: Zap,     query: 'new arrivals'        },
  { label: 'Gift Ideas',        Icon: Gift,    query: 'gift ideas'          },
  { label: 'Luxury Picks',      Icon: Star,    query: 'luxury exclusive'    },
];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const ProductSuggestionPanel = ({ customer, inSession = false, autoQuery = null, onShareToChat }) => {
  const navigate = useNavigate();
  const { products, inventory, addToCart, setCartCustomer } = useAppStore();

  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [typing, setTyping]     = useState(false);
  const [staged, setStaged]     = useState([]);
  const chatEndRef       = useRef(null);
  const prevAutoQueryRef = useRef(null);

  // Init chat with AI greeting + personalised recs when customer changes
  useEffect(() => {
    const recs = getRecommendations(customer, products, 2);
    const firstName = customer.name.split(' ')[0];
    setMessages([
      {
        id: 'init',
        role: 'ai',
        text: `Hi! I've analysed **${firstName}'s** profile — **${customer.tier} Member**, ${customer.visitCount} visits, LTV **$${(customer.ltv / 1000).toFixed(0)}k**. Based on their style preferences (${customer.preferences.categories.slice(0, 2).join(', ')}) and favourite colours (${customer.preferences.colors.slice(0, 3).join(', ')}), here are my top picks for today's session:`,
        products: recs,
        timestamp: new Date(),
      },
    ]);
    setStaged([]);
  }, [customer.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  // Fire when a session-detected autoQuery arrives
  useEffect(() => {
    if (autoQuery && autoQuery !== prevAutoQueryRef.current) {
      prevAutoQueryRef.current = autoQuery;
      sendMessage(autoQuery, 'session'); // eslint-disable-line react-hooks/exhaustive-deps
    }
  }, [autoQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = (text, source = 'manual') => {
    if (!text.trim()) return;
    if (source === 'manual' && typing) return;

    if (source === 'manual') {
      setMessages((prev) => [...prev, { id: Date.now(), role: 'user', text: text.trim() }]);
      setInput('');
    } else {
      // Session auto-query: show a subtle system divider instead of a user bubble
      setMessages((prev) => [...prev, {
        id: Date.now(),
        role: 'system',
        text: `Listening… customer mentioned "${text.split(' ').slice(0, 3).join(' ')}"`,
      }]);
    }
    setTyping(true);

    const delay = source === 'session' ? 500 + Math.random() * 500 : 800 + Math.random() * 700;
    setTimeout(() => {
      const { text: aiText, products: aiProducts } = getAIResponse(text, customer, products);
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: 'ai', text: aiText, products: aiProducts, source },
      ]);
    }, delay);
  };

  const handleStage = (product) => {
    setStaged((prev) =>
      prev.some((s) => s.id === product.id)
        ? prev.filter((s) => s.id !== product.id)
        : [...prev, product]
    );
  };

  const handleAddToCart = (product) => {
    setCartCustomer(customer.id);
    // Pick the customer's first relevant size, fall back to first product size
    const custSizes = Object.values(customer.preferences.sizes);
    const size = product.sizes?.find((s) => custSizes.includes(s)) ?? product.sizes?.[0] ?? 'M';
    const color = product.colors[0];
    addToCart(product, size, color);
  };

  const handleLaunchSession = () => {
    navigate('/live-shopping', {
      state: {
        role: 'stylist',
        source: 'session-prep',
        customer: { id: customer.id, name: customer.name, tier: customer.tier },
        stagedProducts: staged,
      },
    });
  };

  return (
    <div className={`flex flex-col ${inSession ? 'h-full' : ''}`} style={inSession ? undefined : { height: '580px' }}>
      {/* Listening indicator — only in live session */}
      {inSession && (
        <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-violet-500 border-b border-violet-700/30">
          {/* Animated soundwave bars */}
          <div className="flex items-end gap-[3px] h-4">
            {[0, 0.1, 0.2, 0.07, 0.15, 0.05, 0.18].map((delay, i) => (
              <div
                key={i}
                className="w-[3px] rounded-full bg-white/80"
                style={{
                  animation: 'listeningBar 0.8s ease-in-out infinite alternate',
                  animationDelay: `${delay}s`,
                  minHeight: 3,
                }}
              />
            ))}
          </div>
          <p className="text-[10px] text-white font-sans font-bold uppercase tracking-widest">
            Listening to session
          </p>
          {/* Pulsing dot */}
          <span className="ml-auto w-2 h-2 rounded-full bg-white/70 animate-pulse" />
        </div>
      )}
      <style>{`
        @keyframes listeningBar {
          0%   { height: 3px;  opacity: 0.5; }
          100% { height: 16px; opacity: 1;   }
        }
      `}</style>

      {/* Session shelf */}
      <SessionShelf
        staged={staged}
        onRemove={(id) => setStaged((prev) => prev.filter((s) => s.id !== id))}
        onLaunch={handleLaunchSession}
        inSession={inSession}
      />

      {/* Chat scroll area */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-0.5">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            msg={msg}
            customer={customer}
            inventory={inventory}
            staged={staged}
            onStage={handleStage}
            onAddToCart={handleAddToCart}
            onShareToChat={onShareToChat}
          />
        ))}
        {typing && <TypingIndicator />}
        <div ref={chatEndRef} />
      </div>

      {/* Quick prompts */}
      <div className="flex gap-1.5 flex-wrap pt-3 pb-2 border-t border-gray-100 mt-2">
        {QUICK_PROMPTS.map(({ label, Icon, query }) => (
          <button
            key={label}
            onClick={() => sendMessage(query)}
            disabled={typing}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-gray-200 bg-white text-[11px] font-sans font-medium text-gray-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-all disabled:opacity-40"
          >
            <Icon size={10} />
            {label}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div className="flex gap-2 pt-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
          placeholder="Ask the AI stylist… e.g. 'accessories under $500'"
          className="flex-1 text-sm font-sans border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-100 placeholder-gray-300 bg-white"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || typing}
          className="w-11 h-11 rounded-xl bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 shadow-sm"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
};

export default ProductSuggestionPanel;
