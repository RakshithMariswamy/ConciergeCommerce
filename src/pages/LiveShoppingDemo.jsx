import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { mockProducts, mockCustomers } from '../data/mockData';
import ProductSuggestionPanel from '../components/associate/ProductSuggestionPanel';
import CartBuilder from '../components/associate/CartBuilder';
import LiveSessionLayout from '../features/liveShopping/components/LiveSessionLayout';
import useAppStore from '../store/useAppStore';
import { ArrowLeft, Radio, ShoppingBag, X } from 'lucide-react';

const LiveShoppingDemo = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state || {};

  const customerInfo = routeState.customer || null;
  const taskInfo     = routeState.task     || null;

  // Resolve full customer profile (falls back to a minimal stub)
  const fullCustomer = useMemo(() => {
    if (!customerInfo) return null;
    const found = mockCustomers.find((c) => c.id === customerInfo.id);
    if (found) return found;
    return {
      id: customerInfo.id || 'guest',
      name: customerInfo.name || 'Guest',
      initials: (customerInfo.name || 'G').split(' ').map((w) => w[0]).join('').slice(0, 2),
      tier: customerInfo.tier || 'Silver',
      ltv: 0,
      visitCount: 0,
      loyaltyPoints: 0,
      preferences: { sizes: {}, colors: [], categories: [], notes: '' },
      recentPurchases: [],
    };
  }, [customerInfo]);

  const products = useMemo(
    () => mockProducts.slice(0, 12).map((p) => ({ ...p, imageUrl: p.image || null })),
    []
  );

  const [autoQuery, setAutoQuery]         = useState(null);
  const [cartOpen, setCartOpen]           = useState(false);
  const [injectChatMsg, setInjectChatMsg] = useState(null);

  const cart      = useAppStore((s) => s.cart);
  const cartCount = cart.items.reduce((sum, i) => sum + i.qty, 0);

  // Derive display values for video tile
  const customerName     = fullCustomer?.name || 'Customer';
  const customerInitials = fullCustomer?.initials || 'CU';

  // AI panel — passed into LiveSessionLayout as a pre-built node
  const aiPane = fullCustomer ? (
    <ProductSuggestionPanel
      customer={fullCustomer}
      products={products}
      inSession
      autoQuery={autoQuery}
      onShareToChat={(msg) => setInjectChatMsg(msg)}
    />
  ) : (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 p-6 text-center">
      <p className="text-sm font-sans">No customer in session.</p>
      <p className="text-xs font-sans text-gray-300">
        Launch a session from a customer's profile to enable AI suggestions.
      </p>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-white overflow-hidden">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex flex-wrap items-center gap-3 border-b border-white/10 bg-slate-900/95 backdrop-blur-sm px-4 py-2.5 z-10">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-xs font-sans font-semibold"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <div className="w-px h-5 bg-white/10" />

        {/* Title */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/30 rounded-full px-2.5 py-1">
            <Radio size={11} className="text-red-400 animate-pulse" />
            <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Live</span>
          </div>
          <p className="text-sm font-serif font-light text-white/90">Concierge Live Session</p>
        </div>

        {/* Cart button */}
        <button
          onClick={() => setCartOpen(true)}
          className="relative ml-auto flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"
        >
          <ShoppingBag size={18} />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-amber-400 text-charcoal text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
              {cartCount}
            </span>
          )}
        </button>

        {/* Customer context chip */}
        {customerInfo && (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5">
            <div className="w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
              {customerInitials}
            </div>
            <div>
              <p className="text-xs font-semibold text-white font-sans leading-none">{customerName}</p>
              {(customerInfo.tier || taskInfo?.item) && (
                <p className="text-[10px] text-white/40 font-sans mt-0.5">
                  {customerInfo.tier && (
                    <span className="font-semibold text-amber-400">{customerInfo.tier}</span>
                  )}
                  {customerInfo.tier && taskInfo?.item && ' · '}
                  {taskInfo?.item && taskInfo.item.slice(0, 40)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Cart slide-over ──────────────────────────────────────────────── */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/50 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          />
          {/* Drawer */}
          <div className="w-[680px] max-w-full h-full bg-cream overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag size={16} className="text-charcoal" />
                <h2 className="font-serif text-lg font-medium text-charcoal">Session Cart</h2>
                {cartCount > 0 && (
                  <span className="text-xs font-sans text-gray-400">· {cartCount} item{cartCount !== 1 ? 's' : ''}</span>
                )}
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="text-gray-400 hover:text-charcoal transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 p-6">
              <CartBuilder
                onSendToChat={(msg) => {
                  setInjectChatMsg(msg);
                  setCartOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 3-panel session area ─────────────────────────────────────────── */}
      <div className="flex-1 min-h-0">
        <LiveSessionLayout
          aiPane={aiPane}
          customerName={customerName}
          customerInitials={customerInitials}
          stylistName="Stylist"
          onEndCall={() => navigate(-1)}
          onAutoQuery={setAutoQuery}
          injectMessage={injectChatMsg}
          onInjectConsumed={() => setInjectChatMsg(null)}
        />
      </div>
    </div>
  );
};

export default LiveShoppingDemo;
