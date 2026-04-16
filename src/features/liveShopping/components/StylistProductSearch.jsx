import { useMemo, useState } from 'react';

const normalizeToSessionLine = (product) => ({
  productId: product.id,
  sku: product.sku,
  name: product.name,
  price: product.price,
  imageUrl: product.imageUrl || null,
  color: product.colors?.[0] || null,
  size: product.sizes?.[0] || null,
  variantKey: `${product.colors?.[0] || 'default'}-${product.sizes?.[0] || 'default'}`,
  quantity: 1,
});

const StylistProductSearch = ({ products, onAddToSession }) => {
  const [query, setQuery] = useState('');

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 10);

    return products
      .filter(
        (product) =>
          product.name.toLowerCase().includes(q) ||
          product.sku.toLowerCase().includes(q) ||
          product.category.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [products, query]);

  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold uppercase tracking-wide text-white/70">
        Product Search
      </label>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name, SKU, or category"
        className="w-full rounded-lg border border-white/20 bg-black px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none"
      />

      <div className="space-y-2">
        {visibleProducts.map((product) => (
          <div
            key={product.id}
            className="rounded-lg border border-white/15 bg-black/60 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{product.name}</p>
                <p className="text-xs text-white/60">{product.sku}</p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-white">${product.price.toLocaleString()}</p>
            </div>

            <button
              onClick={() => onAddToSession(normalizeToSessionLine(product))}
              className="mt-3 w-full rounded-md border border-white bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-black hover:bg-white/90"
            >
              Add to Session
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StylistProductSearch;
