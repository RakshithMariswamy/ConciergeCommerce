import { callAgentJson, isAgentEnabled } from '../services/agentProxy';

const scoreProduct = (customer, product) => {
  let score = 0;
  const prefs = customer.preferences || {};

  if ((prefs.categories || []).includes(product.category)) score += 4;

  const customerColors = (prefs.colors || []).map((c) => c.toLowerCase());
  const matchedColor = (product.colors || []).some((color) =>
    customerColors.some((pref) => color.toLowerCase().includes(pref) || pref.includes(color.toLowerCase()))
  );

  if (matchedColor) score += 2;

  if (customer.tier === 'Platinum' && product.price > 1000) score += 1;

  return score;
};

const localBrief = ({ customer, currentTask, products }) => {
  const topProducts = [...(products || [])]
    .map((p) => ({ ...p, _score: scoreProduct(customer, p) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 3)
    .map((p) => ({
      sku: p.sku,
      name: p.name,
      category: p.category,
      price: p.price,
      reason: `Aligns with ${customer.name.split(' ')[0]}'s ${p.category.toLowerCase()} preference.`,
    }));

  return {
    greetingSuggestion: `Welcome back ${customer.name.split(' ')[0]}. I curated a few pieces aligned with your previous purchases and preferred palette.`,
    topRecommendations: topProducts,
    upsellOpportunity:
      customer.tier === 'Platinum'
        ? 'Offer a private capsule bundle with an accessory add-on to increase basket size.'
        : 'Pair the core item with a complementary accessory to build a complete look.',
    communicationStyleHint:
      customer.preferences?.notes || 'Keep suggestions concise, premium, and preference-led.',
    taskContext: currentTask ? currentTask.item : null,
  };
};

export async function generateCustomerBrief({ customer, currentTask, products }) {
  if (!customer) {
    return {
      greetingSuggestion: 'Select a customer to generate an AI brief.',
      topRecommendations: [],
      upsellOpportunity: null,
      communicationStyleHint: null,
    };
  }

  if (!isAgentEnabled()) {
    return localBrief({ customer, currentTask, products });
  }

  try {
    const brief = await callAgentJson({
      maxTokens: 900,
      system: [
        {
          type: 'text',
          text: 'You are a clienteling assistant. Return JSON only with keys: greetingSuggestion, topRecommendations (max 3), upsellOpportunity, communicationStyleHint.',
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: JSON.stringify({
            customer,
            currentTask,
            products: (products || []).map((p) => ({
              sku: p.sku,
              name: p.name,
              category: p.category,
              colors: p.colors,
              price: p.price,
            })),
          }),
        },
      ],
    });

    if (!brief?.greetingSuggestion) {
      return localBrief({ customer, currentTask, products });
    }

    return brief;
  } catch (_err) {
    return localBrief({ customer, currentTask, products });
  }
}
