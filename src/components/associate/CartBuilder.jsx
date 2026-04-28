import { useState, useMemo } from 'react';
import { ShoppingBag, Plus, Minus, Trash2, Send, CreditCard, X, Copy, Check } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import { useAgent } from '../../hooks/useAgent';

// Deterministic mock QR pattern from a string token
const buildQrPattern = (token) => {
  const seed = token.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return Array.from({ length: 64 }, (_, i) => ((seed * (i + 7) * 13) % 17) > 7);
};

const CartBuilder = ({ onSendToChat }) => {
  const {
    products, inventory, customers, cart,
    addToCart, removeFromCart, updateCartQty, clearCart,
    setCartCustomer, generatePaymentLink, paymentLink, clearPaymentLink,
  } = useAppStore();

  const [query,           setQuery]           = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize,    setSelectedSize]    = useState(null);
  const [selectedColor,   setSelectedColor]   = useState(null);
  const [showModal,       setShowModal]       = useState(false);
  const [copied,          setCopied]          = useState(false);
  const [aiRequest,       setAiRequest]       = useState('');
  const { invokeRouted, isThinking, result: aiResult, error: aiError } = useAgent('orchestrator');

  const cartCustomer = customers.find((c) => c.id === cart.customerId);
  const cartTotal    = cart.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const cartCount    = cart.items.reduce((sum, i) => sum + i.qty, 0);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.sku.toLowerCase().includes(query.toLowerCase())
  );

  const getStock = (sku, color, size) =>
    inventory[sku]?.[color]?.[size] ?? 0;

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setSelectedColor(product.colors[0]);
    setSelectedSize(null);
    setQuery('');
  };

  const handleAddToCart = () => {
    if (!selectedProduct || !selectedColor) return;
    const size = selectedProduct.sizes[0] === 'One Size' ? 'One Size' : selectedSize;
    if (!size) return;
    addToCart(selectedProduct, size, selectedColor);
    setSelectedProduct(null);
    setSelectedSize(null);
    setSelectedColor(null);
  };

  const handleAICartBuild = async () => {
    if (!aiRequest.trim()) return;
    const cartApiRef = { addToCart, clearCart, setCartCustomer };
    try {
      await invokeRouted({
        intent: `Build a client-ready cart based on this request: ${aiRequest}`,
        context: {
          source: 'cart-builder',
          hasCustomer: Boolean(cartCustomer),
          customerTier: cartCustomer?.tier || null,
        },
        payloadByAgent: {
          cart_builder: {
            customerProfile: cartCustomer || null,
            request: aiRequest,
            products,
            inventory,
            cartApi: cartApiRef,
          },
        },
        defaultPayload: {
          customerProfile: cartCustomer || null,
          request: aiRequest,
          products,
          inventory,
          cartApi: cartApiRef,
        },
      });
    } catch {
      // error is captured in aiError from useAgent hook — displayed in UI
    }
  };

  const handleCopy = async () => {
    if (!paymentLink) return;
    await navigator.clipboard.writeText(paymentLink.url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrPattern = useMemo(
    () => (paymentLink ? buildQrPattern(paymentLink.token) : []),
    [paymentLink?.token]
  );

  const isOneSize = selectedProduct?.sizes[0] === 'One Size';
  const canAdd    = selectedProduct && selectedColor && (isOneSize || selectedSize);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* ─── Left: Product selector ─── */}
      <div className="space-y-4">
        <p className="text-[10px] font-sans uppercase tracking-wider text-gray-400">Add Items</p>

        {/* Customer selector */}
        <div className="bg-white rounded-xl p-4 shadow-luxury">
          <p className="text-[10px] text-gray-400 font-sans uppercase tracking-wider mb-2">Cart For</p>
          <select
            value={cart.customerId || ''}
            onChange={(e) => setCartCustomer(e.target.value || null)}
            className="w-full text-sm font-sans text-slate-900 bg-slate-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-600 transition-colors"
          >
            <option value="">Walk-in Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.tier})
              </option>
            ))}
          </select>
        </div>

        {/* AI cart builder */}
        <div className="bg-violet-50/60 border border-violet-200 rounded-xl p-4 shadow-luxury">
          <p className="text-[10px] text-violet-500 font-sans uppercase tracking-wider mb-2">
            AI Cart Builder
          </p>
          <textarea
            value={aiRequest}
            onChange={(e) => setAiRequest(e.target.value)}
            rows={3}
            placeholder="Example: Build a summer capsule wardrobe for a Platinum client, minimalist style, budget 5000"
            className="w-full text-sm font-sans text-slate-900 bg-white border border-violet-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-violet-400 resize-none"
          />
          <button
            onClick={handleAICartBuild}
            disabled={isThinking || !aiRequest.trim()}
            className="mt-2.5 w-full bg-violet-600 text-white py-2.5 rounded-lg text-sm font-sans font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isThinking ? 'Building Cart...' : 'Build With AI'}
          </button>

          {/* Error state */}
          {aiError && !isThinking && (
            <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-xs font-semibold text-red-700 mb-0.5">Cart build failed</p>
              <p className="text-xs text-red-600">{aiError.message || String(aiError)}</p>
            </div>
          )}

          {/* Orchestrator route badge */}
          {aiResult?.route?.agent && !isThinking && (
            <p className="mt-2 text-[10px] text-indigo-500 font-sans uppercase tracking-wider">
              Routed via orchestrator to: {aiResult.route.agent}
            </p>
          )}

          {/* Summary message */}
          {aiResult?.result?.summary && !isThinking && (
            <div className={`mt-2 p-3 rounded-lg border text-xs font-sans leading-relaxed ${
              aiResult.result.addedItems?.length > 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              {aiResult.result.summary}
            </div>
          )}

          {/* Added items list */}
          {aiResult?.result?.addedItems?.length > 0 && !isThinking && (
            <div className="mt-2 space-y-1">
              {aiResult.result.addedItems.map((item) => (
                <div key={item.sku} className="flex items-center justify-between text-xs bg-white border border-violet-100 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                    <span className="font-medium text-slate-800 truncate">{item.name}</span>
                    <span className="text-slate-400 shrink-0">{item.category}</span>
                  </div>
                  <span className="font-semibold text-slate-700 shrink-0 ml-2">
                    ${item.price?.toLocaleString()}
                  </span>
                </div>
              ))}
              <p className="text-[10px] text-slate-400 text-right pt-0.5">
                Total: ${aiResult.result.total?.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* Product search */}
        {!selectedProduct && (
          <>
            <input
              type="text"
              placeholder="Search product or SKU…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-sans focus:outline-none focus:border-indigo-600 transition-colors placeholder-gray-300"
            />
            <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-hide">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  className="w-full text-left bg-white rounded-xl p-3.5 shadow-luxury hover:shadow-luxury-hover transition-all border-2 border-transparent hover:border-indigo-400/30"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 font-sans">{product.sku}</p>
                      <p className="font-sans font-medium text-slate-900 text-sm truncate">
                        {product.name}
                      </p>
                    </div>
                    <p className="text-sm font-sans font-semibold text-slate-900 flex-shrink-0">
                      ${product.price.toLocaleString()}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Size + colour selector */}
        {selectedProduct && (
          <div className="bg-white rounded-xl p-4 shadow-luxury space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-sans font-semibold text-slate-900">{selectedProduct.name}</h3>
              <button
                onClick={() => { setSelectedProduct(null); setSelectedSize(null); setSelectedColor(null); }}
                className="text-gray-400 hover:text-indigo-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Colour */}
            <div>
              <p className="text-[10px] text-gray-400 font-sans uppercase tracking-wider mb-2">
                Colour
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedProduct.colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => { setSelectedColor(color); setSelectedSize(null); }}
                    className={`text-xs font-sans px-3 py-1.5 rounded-full border transition-colors ${
                      selectedColor === color
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-600'
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            {/* Size (skip for One Size) */}
            {!isOneSize && (
              <div>
                <p className="text-[10px] text-gray-400 font-sans uppercase tracking-wider mb-2">
                  Size
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.sizes.map((size) => {
                    const stock = getStock(selectedProduct.sku, selectedColor, size);
                    return (
                      <button
                        key={size}
                        onClick={() => stock > 0 && setSelectedSize(size)}
                        disabled={stock === 0}
                        className={`relative text-xs font-sans px-3 py-1.5 rounded border transition-colors ${
                          selectedSize === size
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent'
                            : stock === 0
                            ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed line-through'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-600'
                        }`}
                      >
                        {size}
                        {stock > 0 && stock <= 2 && (
                          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-400 rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                            {stock}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={handleAddToCart}
              disabled={!canAdd}
              className="w-full bg-charcoal text-white py-3 rounded-xl text-sm font-sans font-medium hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Plus size={15} />
              Add — ${selectedProduct.price.toLocaleString()}
            </button>
          </div>
        )}
      </div>

      {/* ─── Right: Cart ─── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-sans uppercase tracking-wider text-gray-400">
            Cart{cartCount > 0 && ` · ${cartCount} items`}
          </p>
          {cart.items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-gray-400 hover:text-indigo-600 font-sans transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {cart.items.length === 0 ? (
          <div className="bg-white rounded-xl p-10 shadow-luxury text-center text-gray-300">
            <ShoppingBag size={40} strokeWidth={1} className="mx-auto mb-3" />
            <p className="font-sans text-sm">Cart is empty</p>
            <p className="font-sans text-xs mt-1 text-gray-200">Search and add products above</p>
          </div>
        ) : (
          <>
            {cartCustomer && (
              <div className="bg-charcoal/5 border border-charcoal/10 rounded-xl p-3 text-sm font-sans text-gray-500">
                Assigned to{' '}
                <span className="font-semibold text-slate-900">{cartCustomer.name}</span>{' '}
                · {cartCustomer.tier}
              </div>
            )}

            <div className="bg-white rounded-xl shadow-luxury overflow-hidden">
              {cart.items.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-4 flex items-center gap-3 ${
                    idx < cart.items.length - 1 ? 'border-b border-gray-50' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-sans font-medium text-slate-900 text-sm">{item.name}</p>
                    <p className="text-xs text-gray-400 font-sans mt-0.5">
                      {item.color} · {item.size}
                    </p>
                  </div>
                  {/* Qty stepper */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateCartQty(item.id, item.qty - 1)}
                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-indigo-600 hover:text-indigo-600 transition-colors"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="w-5 text-center text-sm font-sans">{item.qty}</span>
                    <button
                      onClick={() => updateCartQty(item.id, item.qty + 1)}
                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-indigo-600 hover:text-indigo-600 transition-colors"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                  <p className="text-sm font-sans font-semibold text-charcoal w-16 text-right">
                    ${(item.price * item.qty).toLocaleString()}
                  </p>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-gray-200 hover:text-charcoal transition-colors ml-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {/* Total */}
              <div className="p-4 bg-gray-50/70 flex items-center justify-between border-t border-gray-100">
                <span className="font-sans text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Total
                </span>
                <span className="font-serif text-2xl font-medium text-charcoal">
                  ${cartTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleGenerateLink}
                className="bg-charcoal text-white py-3.5 rounded-xl text-sm font-sans font-medium hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Send size={15} />
                Send Link
              </button>
              <button className="bg-gold text-charcoal py-3.5 rounded-xl text-sm font-sans font-medium hover:bg-gold-dark active:scale-95 transition-all flex items-center justify-center gap-2">
                <CreditCard size={15} />
                Process POS
              </button>
            </div>
          </>
        )}
      </div>

      {/* ─── Payment link modal ─── */}
      {showModal && paymentLink && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Send size={22} className="text-green-600" />
              </div>
              <h3 className="font-serif text-2xl font-medium text-charcoal">Payment Link</h3>
              {cartCustomer && (
                <p className="text-gray-500 text-sm font-sans mt-1">Ready to send to {cartCustomer.name}</p>
              )}
            </div>

            {/* URL box */}
            <div className="bg-cream border border-gray-200 rounded-xl p-3.5 mb-4">
              <p className="text-[10px] text-gray-400 font-sans uppercase tracking-wider mb-1">
                Secure Payment URL
              </p>
              <p className="text-xs font-sans font-medium text-charcoal break-all leading-relaxed">
                {paymentLink.url}
              </p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-400 font-sans">
                  {paymentLink.itemCount} items · ${paymentLink.total.toLocaleString()}
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-xs font-sans text-charcoal hover:text-gold transition-colors font-medium"
                >
                  {copied ? (
                    <><Check size={12} className="text-green-500" /> Copied!</>
                  ) : (
                    <><Copy size={12} /> Copy</>
                  )}
                </button>
              </div>
            </div>

            {/* Mock QR code */}
            <div className="bg-charcoal rounded-xl p-4 flex items-center justify-center mb-4">
              <div className="grid grid-cols-8 gap-0.5">
                {qrPattern.map((filled, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-sm ${filled ? 'bg-white' : 'bg-charcoal'}`}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setShowModal(false); clearPaymentLink(); clearCart(); }}
                className="bg-green-600 text-white py-3 rounded-xl text-sm font-sans font-medium hover:bg-green-700 transition-colors"
              >
                Confirm Sent
              </button>
              <button
                onClick={() => { setShowModal(false); clearPaymentLink(); }}
                className="bg-gray-100 text-gray-700 py-3 rounded-xl text-sm font-sans font-medium hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartBuilder;
