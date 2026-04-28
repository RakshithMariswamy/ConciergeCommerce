import { useState } from 'react';
import { Search, Package, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import useAppStore from '../../store/useAppStore';

const StockCell = ({ qty }) => {
  if (qty === 0) {
    return (
      <div className="rounded-lg p-2.5 text-center bg-gray-100 border border-gray-200">
        <span className="text-gray-600 text-xs font-sans font-semibold">—</span>
      </div>
    );
  }
  if (qty <= 2) {
    return (
      <div className="rounded-lg p-2.5 text-center bg-amber-50 border border-amber-100">
        <span className="text-amber-600 text-xs font-sans font-bold">{qty}</span>
      </div>
    );
  }
  return (
    <div className="rounded-lg p-2.5 text-center bg-green-50 border border-green-100">
      <span className="text-green-600 text-xs font-sans font-bold">{qty}</span>
    </div>
  );
};

const totalForSku = (inventory, sku) => {
  const inv = inventory[sku];
  if (!inv) return 0;
  return Object.values(inv).reduce(
    (total, colorObj) => total + Object.values(colorObj).reduce((s, v) => s + v, 0),
    0
  );
};

const InventoryPanel = () => {
  const { products, inventory } = useAppStore();
  const [query, setQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.sku.toLowerCase().includes(query.toLowerCase()) ||
      p.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (product) => {
    setSelectedProduct(product);
    setSelectedColor(product.colors[0]);
  };

  const colorInventory =
    selectedProduct && selectedColor
      ? inventory[selectedProduct.sku]?.[selectedColor] ?? {}
      : {};

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search product, SKU or category…"
          className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-9 py-3 text-sm font-sans focus:outline-none focus:border-charcoal transition-colors placeholder-gray-300"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Product list */}
        <div className="lg:col-span-2 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-hide pr-1">
          {filtered.map((product) => {
            const total      = totalForSku(inventory, product.sku);
            const isSelected = selectedProduct?.id === product.id;

            return (
              <button
                key={product.id}
                onClick={() => handleSelect(product)}
                className={`w-full text-left bg-white rounded-xl p-3.5 shadow-luxury hover:shadow-luxury-hover transition-all duration-200 border-2 ${
                  isSelected ? 'border-charcoal' : 'border-transparent'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 font-sans uppercase tracking-wider">
                      {product.sku}
                    </p>
                    <p className="font-sans font-medium text-charcoal text-sm mt-0.5 truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-400 font-sans">{product.category}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-sans font-semibold text-charcoal">
                      ${product.price.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 mt-1 justify-end">
                      {total === 0 ? (
                        <AlertTriangle size={10} className="text-gray-600" />
                      ) : total <= 6 ? (
                        <AlertTriangle size={10} className="text-amber-400" />
                      ) : (
                        <CheckCircle2 size={10} className="text-green-500" />
                      )}
                      <span
                        className={`text-[10px] font-sans font-semibold ${
                          total === 0
                            ? 'text-gray-600'
                            : total <= 6
                            ? 'text-amber-500'
                            : 'text-green-600'
                        }`}
                      >
                        {total === 0 ? 'Out of stock' : `${total} units`}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-3">
          {selectedProduct ? (
            <div className="bg-white rounded-xl shadow-luxury p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] font-sans uppercase tracking-wider text-gray-400">
                    {selectedProduct.sku}
                  </p>
                  <h3 className="font-serif text-2xl font-medium text-charcoal">
                    {selectedProduct.name}
                  </h3>
                  <p className="text-sm text-gray-400 font-sans mt-0.5">
                    {selectedProduct.material} · {selectedProduct.origin}
                  </p>
                </div>
                <p className="font-serif text-xl font-medium text-charcoal flex-shrink-0 ml-4">
                  ${selectedProduct.price.toLocaleString()}
                </p>
              </div>

              {/* Colour selector */}
              <div className="mb-4">
                <p className="text-[10px] font-sans text-gray-400 uppercase tracking-wider mb-2">
                  Colour
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`text-xs font-sans px-3 py-1.5 rounded-full border transition-colors ${
                        selectedColor === color
                          ? 'bg-charcoal text-white border-charcoal'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-600'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stock grid */}
              {Object.keys(colorInventory).length > 0 && (
                <div>
                  <p className="text-[10px] font-sans text-gray-400 uppercase tracking-wider mb-2">
                    Stock — {selectedColor}
                  </p>
                  <div
                    className="grid gap-2"
                    style={{
                      gridTemplateColumns: `repeat(${Math.min(
                        Object.keys(colorInventory).length,
                        6
                      )}, minmax(0, 1fr))`,
                    }}
                  >
                    {Object.entries(colorInventory).map(([size, qty]) => (
                      <div key={size}>
                        <p className="text-[10px] text-center text-gray-400 font-sans mb-1">{size}</p>
                        <StockCell qty={qty} />
                      </div>
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 mt-4 text-[10px] font-sans text-gray-400">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-green-100 border border-green-200" />
                      3+
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-amber-50 border border-amber-100" />
                      1–2
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200" />
                      Out
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-56 text-gray-300">
              <Package size={40} strokeWidth={1} className="mb-3 opacity-50" />
              <p className="font-sans text-sm">Select a product to view stock levels</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryPanel;
