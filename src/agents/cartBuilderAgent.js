import { callAgentRaw, extractTextFromContent, isAgentEnabled } from '../services/agentProxy';
import {
  buildCartApiFromStore,
  executeAnthropicToolUseBlocks,
  executeToolCall,
} from '../services/toolExecutor';

export const CART_TOOLS = [
  {
    name: 'search_products',
    description: 'Search products by category, color, and price range',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string' },
        maxPrice: { type: 'number' },
        colors: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    name: 'check_inventory',
    description: 'Check stock availability for a SKU and optional size',
    input_schema: {
      type: 'object',
      properties: {
        sku: { type: 'string' },
        size: { type: 'string' },
      },
      required: ['sku'],
    },
  },
  {
    name: 'add_to_cart',
    description: 'Add a product to cart',
    input_schema: {
      type: 'object',
      properties: {
        sku: { type: 'string' },
        quantity: { type: 'number' },
        size: { type: 'string' },
        color: { type: 'string' },
      },
      required: ['sku'],
    },
  },
];

const inferCategory = (request = '') => {
  const q = request.toLowerCase();
  if (/(tailor|blazer|trouser|formal|suit)/.test(q)) return 'Tailoring';
  if (/(accessor|bag|belt|scarf|handbag)/.test(q)) return 'Accessories';
  if (/(sweater|knit|cashmere|merino|pullover)/.test(q)) return 'Knitwear';
  if (/(coat|outerwear|overcoat|jacket)/.test(q)) return 'Outerwear';
  if (/(shirt|casual|linen|summer|spring|light|capsule|relax)/.test(q)) return 'Casualwear';
  return null;
};

const inferBudget = (request = '') => {
  const match = request.match(/(?:\$|€|£)?\s?(\d{3,5})/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
};

const localCartBuild = ({ request, products, inventory, customerProfile, cartApi }) => {
  const category = inferCategory(request);
  const budget = inferBudget(request);

  const pool = products
    .filter((p) => (category ? p.category === category : true))
    .sort((a, b) => a.price - b.price);

  const chosen = [];
  let total = 0;

  for (const product of pool) {
    if (chosen.length >= 4) break;
    if (budget && total + product.price > budget) continue;

    const stockResult = executeToolCall({
      name: 'check_inventory',
      input: { sku: product.sku },
      products,
      inventory,
      cartApi,
    });

    if (!stockResult?.stock) continue;

    executeToolCall({
      name: 'add_to_cart',
      input: { sku: product.sku, quantity: 1 },
      products,
      inventory,
      cartApi,
    });

    chosen.push({
      sku: product.sku,
      name: product.name,
      category: product.category,
      price: product.price,
    });
    total += product.price;
  }

  return {
    summary:
      chosen.length > 0
        ? `Added ${chosen.length} item${chosen.length > 1 ? 's' : ''} to the cart for ${customerProfile?.name || 'guest'} — total $${total.toLocaleString()}.`
        : `No products found matching "${request.slice(0, 60)}"${budget ? ` within a $${budget.toLocaleString()} budget` : ''}. Try a different style, category, or remove the budget filter.`,
    addedItems: chosen,
    total,
    mode: 'local',
    categoryUsed: category || 'all',
  };
};

const buildSystemPrompt = (customerProfile, products) => [
  {
    type: 'text',
    text: `You are an elite retail stylist cart-building agent. Build carts using tools only.\nGoal: satisfy user request with in-stock items and stay within budget when provided.\nReturn a concise summary when done.\nCustomer: ${JSON.stringify(customerProfile || {}, null, 2)}\nCatalog sample: ${JSON.stringify(
      (products || []).slice(0, 12).map((p) => ({
        sku: p.sku,
        name: p.name,
        category: p.category,
        price: p.price,
        colors: p.colors,
      })),
      null,
      2
    )}`,
    cache_control: { type: 'ephemeral' },
  },
];

export async function buildCartWithAI({ customerProfile, request, products, inventory, cartApi: cartApiInput }) {
  const cartApi = cartApiInput || buildCartApiFromStore();

  if (!isAgentEnabled()) {
    return localCartBuild({ request, products, inventory, customerProfile, cartApi });
  }

  const messages = [
    {
      role: 'user',
      content: request,
    },
  ];

  const transcript = [];

  for (let i = 0; i < 6; i += 1) {
    const response = await callAgentRaw({
      maxTokens: 1400,
      tools: CART_TOOLS,
      system: buildSystemPrompt(customerProfile, products),
      messages,
    });

    transcript.push(...response.content);

    if (response.stop_reason === 'end_turn') {
      return {
        summary: extractTextFromContent(response.content) || 'Cart build completed.',
        addedItems: [],
        mode: 'remote',
      };
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults = executeAnthropicToolUseBlocks({
        contentBlocks: response.content,
        products,
        inventory,
        cartApi,
      });

      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }
  }

  return {
    summary: extractTextFromContent(transcript) || 'Cart build reached tool loop limit.',
    addedItems: [],
    mode: 'remote',
  };
}
