import useAppStore from '../store/useAppStore';

const normalize = (value) => String(value || '').toLowerCase().trim();

const matchesCategory = (product, category) => {
  if (!category) return true;
  return normalize(product.category).includes(normalize(category));
};

const matchesBudget = (product, maxPrice) => {
  if (typeof maxPrice !== 'number') return true;
  return product.price <= maxPrice;
};

const matchesColors = (product, colors = []) => {
  if (!Array.isArray(colors) || colors.length === 0) return true;
  const productColors = product.colors.map((c) => normalize(c));
  return colors.some((color) =>
    productColors.some((pc) => pc.includes(normalize(color)) || normalize(color).includes(pc))
  );
};

const getStock = (inventory, sku, size = null) => {
  const skuMap = inventory?.[sku];
  if (!skuMap) return 0;

  if (size) {
    // Specific size requested: sum that size across all colours
    return Object.values(skuMap).reduce((sum, sizeMap) => sum + (sizeMap[size] || 0), 0);
  }

  // No size specified: sum all stock across every colour and size
  return Object.values(skuMap).reduce(
    (total, sizeMap) => total + Object.values(sizeMap).reduce((s, qty) => s + qty, 0),
    0
  );
};

const searchProducts = (input, products = []) => {
  const { category, maxPrice, colors = [] } = input || {};

  return products
    .filter((product) => matchesCategory(product, category))
    .filter((product) => matchesBudget(product, maxPrice))
    .filter((product) => matchesColors(product, colors))
    .slice(0, 8)
    .map((product) => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      category: product.category,
      price: product.price,
      colors: product.colors,
      sizes: product.sizes,
    }));
};

const checkInventory = (input, inventory = {}) => {
  const { sku, size } = input || {}; // size is intentionally optional

  if (!sku) {
    return { error: 'sku is required' };
  }

  const stock = getStock(inventory, sku, size || null);
  return { sku, size: size || 'any', stock };
};

const addToCart = (input, products = [], cartApi) => {
  const { sku, quantity = 1, size, color } = input || {};
  if (!sku) return { error: 'sku is required' };

  const product = products.find((p) => p.sku === sku);
  if (!product) return { error: `Unknown sku: ${sku}` };

  const chosenColor = color || product.colors[0];
  const chosenSize = size || (product.sizes[0] === 'One Size' ? 'One Size' : product.sizes[0]);

  if (!cartApi?.addToCart) {
    return { error: 'cartApi missing addToCart' };
  }

  cartApi.addToCart(product, chosenSize, chosenColor, quantity);

  return {
    success: true,
    sku,
    quantity,
    size: chosenSize,
    color: chosenColor,
    name: product.name,
  };
};

export const executeToolCall = ({ name, input, products, inventory, cartApi }) => {
  switch (name) {
    case 'search_products':
      return searchProducts(input, products);
    case 'check_inventory':
      return checkInventory(input, inventory);
    case 'add_to_cart':
      return addToCart(input, products, cartApi);
    default:
      return { error: `Unsupported tool: ${name}` };
  }
};

export const executeAnthropicToolUseBlocks = ({ contentBlocks, products, inventory, cartApi }) =>
  (contentBlocks || [])
    .filter((block) => block?.type === 'tool_use')
    .map((block) => ({
      type: 'tool_result',
      tool_use_id: block.id,
      content: JSON.stringify(
        executeToolCall({
          name: block.name,
          input: block.input,
          products,
          inventory,
          cartApi,
        })
      ),
    }));

export const buildCartApiFromStore = () => {
  const state = useAppStore.getState();
  return {
    addToCart: state.addToCart,
    clearCart: state.clearCart,
    setCartCustomer: state.setCartCustomer,
  };
};
