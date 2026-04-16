import { useState } from 'react';
import { ShoppingBag, Heart, Star, Mail, Phone, TrendingUp, ChevronRight, Sparkles } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import ProductSuggestionPanel from './ProductSuggestionPanel';

const TIER_CONFIG = {
  Platinum: {
    bg: 'bg-slate-700',    text: 'text-white',
    ring: 'ring-slate-500', pill: 'bg-slate-700 text-white',
  },
  Gold: {
    bg: 'bg-gold',         text: 'text-charcoal',
    ring: 'ring-gold',     pill: 'bg-gold text-charcoal',
  },
  Silver: {
    bg: 'bg-gray-200',     text: 'text-gray-700',
    ring: 'ring-gray-300', pill: 'bg-gray-200 text-gray-700',
  },
};

const Avatar = ({ customer, size = 'md' }) => {
  const cfg  = TIER_CONFIG[customer.tier] || TIER_CONFIG.Silver;
  const dims = size === 'lg' ? 'w-16 h-16 text-2xl' : 'w-11 h-11 text-base';
  return (
    <div
      className={`${dims} rounded-full flex items-center justify-center font-serif font-medium flex-shrink-0 ring-2 ring-offset-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}
    >
      {customer.initials}
    </div>
  );
};

const CustomerCard = ({ customer, isSelected, onClick }) => {
  const cfg = TIER_CONFIG[customer.tier] || TIER_CONFIG.Silver;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-xl p-4 shadow-luxury hover:shadow-luxury-hover transition-all duration-200 border-2 ${
        isSelected ? 'border-charcoal' : 'border-transparent'
      }`}
    >
      <div className="flex items-center gap-3">
        <Avatar customer={customer} />
        <div className="flex-1 min-w-0">
          <p className="font-sans font-semibold text-charcoal text-sm truncate">{customer.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs font-sans font-semibold px-2 py-0.5 rounded-full ${cfg.pill} uppercase tracking-wider`}>
              {customer.tier}
            </span>
            <span className="text-xs text-gray-400 font-sans">{customer.visitCount} visits</span>
          </div>
        </div>
        <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
      </div>
    </button>
  );
};

const CustomerDetail = ({ customer }) => {
  const [view, setView] = useState('profile');
  const { setCartCustomer } = useAppStore();
  const cfg = TIER_CONFIG[customer.tier] || TIER_CONFIG.Silver;

  return (
    <div className="space-y-4">
      {/* ── View toggle */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        <button
          onClick={() => setView('profile')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            view === 'profile' ? 'bg-white shadow text-charcoal' : 'text-gray-400 hover:text-charcoal'
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => setView('prepare')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            view === 'prepare'
              ? 'bg-white shadow text-violet-700'
              : 'text-gray-400 hover:text-charcoal'
          }`}
        >
          <Sparkles size={11} />
          AI Prepare Session
        </button>
      </div>

      {/* ── AI Prepare view */}
      {view === 'prepare' && <ProductSuggestionPanel customer={customer} />}

      {/* ── Profile view */}
      {view === 'profile' && (
        <>
          {/* Profile card */}
          <div className="bg-charcoal rounded-xl p-5 text-white">
            <div className="flex items-start gap-4">
              <Avatar customer={customer} size="lg" />
              <div className="flex-1 min-w-0">
                <h2 className="font-serif text-2xl font-light leading-tight">{customer.name}</h2>
                <span className={`inline-block text-xs font-sans font-semibold px-2.5 py-1 rounded-full mt-1.5 uppercase tracking-wider ${cfg.pill}`}>
                  {customer.tier} Member
                </span>
                <div className="flex flex-wrap gap-3 mt-2">
                  <a
                    href={`mailto:${customer.email}`}
                    className="flex items-center gap-1 text-white/40 hover:text-gold text-xs font-sans transition-colors"
                  >
                    <Mail size={11} /> {customer.email}
                  </a>
                  <span className="flex items-center gap-1 text-white/40 text-xs font-sans">
                    <Phone size={11} /> {customer.phone}
                  </span>
                </div>
              </div>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/10">
              <div className="text-center">
                <p className="text-gold font-serif text-xl font-medium">
                  ${(customer.ltv / 1000).toFixed(1)}k
                </p>
                <p className="text-white/35 text-[10px] font-sans uppercase tracking-wider mt-0.5">
                  Lifetime Value
                </p>
              </div>
              <div className="text-center">
                <p className="text-white font-serif text-xl font-medium">{customer.visitCount}</p>
                <p className="text-white/35 text-[10px] font-sans uppercase tracking-wider mt-0.5">
                  Visits
                </p>
              </div>
              <div className="text-center">
                <p className="text-white font-serif text-xl font-medium">
                  {customer.loyaltyPoints.toLocaleString()}
                </p>
                <p className="text-white/35 text-[10px] font-sans uppercase tracking-wider mt-0.5">
                  Points
                </p>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-xl p-4 shadow-luxury">
            <h3 className="flex items-center gap-2 text-xs font-sans uppercase tracking-wider text-gray-400 mb-3">
              <Heart size={12} /> Style Profile
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-gray-400 font-sans uppercase tracking-wider mb-1.5">Sizes</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(customer.preferences.sizes).map(([type, size]) => (
                    <span key={type} className="text-xs font-sans bg-cream px-2.5 py-1 rounded text-charcoal border border-gray-100">
                      <span className="text-gray-400 capitalize">{type}:</span> <strong>{size}</strong>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-gray-400 font-sans uppercase tracking-wider mb-1.5">
                  Preferred Colours
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {customer.preferences.colors.map((color) => (
                    <span
                      key={color}
                      className="text-xs font-sans bg-cream px-2.5 py-1 rounded-full text-charcoal border border-gray-100"
                    >
                      {color}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-gray-400 font-sans uppercase tracking-wider mb-1.5">
                  Categories
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {customer.preferences.categories.map((cat) => (
                    <span
                      key={cat}
                      className="text-xs font-sans bg-charcoal text-white px-2.5 py-1 rounded-full"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              {customer.preferences.notes && (
                <div className="bg-gold-50 border border-gold/20 rounded-xl p-3">
                  <p className="text-xs text-charcoal font-sans font-semibold italic leading-relaxed">
                    "{customer.preferences.notes}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Purchase history */}
          <div className="bg-white rounded-xl p-4 shadow-luxury">
            <h3 className="flex items-center gap-2 text-xs font-sans uppercase tracking-wider text-gray-400 mb-3">
              <TrendingUp size={12} /> Recent Purchases
            </h3>
            <div className="divide-y divide-gray-50">
              {customer.recentPurchases.map((purchase, idx) => (
                <div key={idx} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-sans font-medium text-charcoal">{purchase.item}</p>
                    <p className="text-xs text-gray-400 font-sans mt-0.5">
                      {purchase.sku} ·{' '}
                      {new Date(purchase.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <p className="text-sm font-sans font-semibold text-charcoal flex-shrink-0 ml-3">
                    ${purchase.amount.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Build cart CTA */}
          <button
            onClick={() => setCartCustomer(customer.id)}
            className="w-full bg-charcoal text-white py-4 rounded-xl font-sans text-sm uppercase tracking-wider hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <ShoppingBag size={16} />
            Build Cart for {customer.name.split(' ')[0]}
          </button>
        </>
      )}
    </div>
  );
};

const ClientProfile = () => {
  const { customers, selectedCustomerId, selectCustomer } = useAppStore();
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="grid lg:grid-cols-2 gap-4 items-start">
      {/* List */}
      <div>
        <p className="text-[10px] font-sans uppercase tracking-wider text-gray-400 mb-3">
          {customers.length} Clients In-Store Today
        </p>
        <div className="space-y-2">
          {customers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              isSelected={selectedCustomerId === customer.id}
              onClick={() => selectCustomer(customer.id)}
            />
          ))}
        </div>
      </div>

      {/* Detail */}
      <div>
        {selectedCustomer ? (
          <CustomerDetail customer={selectedCustomer} />
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-300">
            <Star size={38} strokeWidth={1} className="mb-3" />
            <p className="font-sans text-sm">Select a client to view their profile</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientProfile;
