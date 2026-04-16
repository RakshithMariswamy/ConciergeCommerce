import StylistProductSearch from './StylistProductSearch';

const SessionBagSidebar = ({
  role,
  products,
  items,
  notifications,
  subtotal,
  onAddToSession,
  onSetQty,
  onRemoveItem,
  onBuyNow,
  checkoutMode,
  unreadNotifications,
}) => {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/15 bg-black/50 p-3">
        <p className="text-xs uppercase tracking-wide text-white/60">Bag Summary</p>
        <p className="mt-1 text-lg font-semibold text-white">${subtotal.toLocaleString()}</p>
        <p className="text-xs text-white/60">{items.length} line item(s)</p>
      </div>

      {role === 'stylist' && (
        <StylistProductSearch products={products} onAddToSession={onAddToSession} />
      )}

      {role === 'customer' && unreadNotifications > 0 && (
        <div className="rounded-lg border border-white/20 bg-white/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-white">New Session Update</p>
          <p className="mt-1 text-sm text-white/75">
            Stylist added {unreadNotifications} item{unreadNotifications === 1 ? '' : 's'} to your bag.
          </p>
        </div>
      )}

      {notifications.length > 0 && role === 'customer' && (
        <div className="space-y-2">
          {notifications.slice(0, 3).map((note) => (
            <div key={note.id} className="rounded-md border border-white/10 bg-black/40 p-2.5">
              <p className="text-xs text-white/80">{note.message}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {items.length === 0 && (
          <div className="rounded-lg border border-dashed border-white/20 p-5 text-center text-sm text-white/60">
            Session bag is empty.
          </div>
        )}

        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-white/15 bg-black/40 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{item.name}</p>
                <p className="text-xs text-white/60">{item.sku}</p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-white">
                ${(item.price * item.quantity).toLocaleString()}
              </p>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onSetQty(item.id, item.quantity - 1)}
                  className="h-7 w-7 rounded border border-white/20 text-sm text-white hover:bg-white/10"
                >
                  -
                </button>
                <span className="w-8 text-center text-sm text-white">{item.quantity}</span>
                <button
                  onClick={() => onSetQty(item.id, item.quantity + 1)}
                  className="h-7 w-7 rounded border border-white/20 text-sm text-white hover:bg-white/10"
                >
                  +
                </button>
              </div>

              {role === 'stylist' ? (
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="rounded border border-white/20 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white/80 hover:bg-white/10"
                >
                  Remove
                </button>
              ) : (
                <button
                  onClick={() => onBuyNow(item, checkoutMode)}
                  className="rounded border border-white bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-black hover:bg-white/90"
                >
                  Buy Now
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SessionBagSidebar;
