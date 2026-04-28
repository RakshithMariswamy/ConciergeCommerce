import { callAgentJson, isAgentEnabled } from '../services/agentProxy';

const localSessionPrep = ({ customer, task, products }) => {
  const tierGoals = {
    Platinum: 'Deliver a white-glove styling experience and curate an exclusive selection for this VIP client.',
    Gold: 'Offer personalised style guidance and introduce new arrivals aligned with their taste.',
    Silver: 'Build loyalty with attentive service and relevant product suggestions.',
    Bronze: 'Welcome this client warmly and help them discover pieces that suit their needs.',
  };

  return {
    sessionGoal: tierGoals[customer?.tier] ?? 'Provide an excellent personalised styling session.',
    talkingPoints: [
      customer?.preferences?.notes ? `Note: ${customer.preferences.notes}` : 'Understand styling goals for today.',
      `Explore ${task?.item || 'the requested category'} options.`,
      'Suggest complementary pieces to complete the look.',
    ],
    productFocus: products.slice(0, 3).map((p) => ({
      name: p.name,
      sku: p.sku || p.id,
      reason: 'Matches requested category.',
    })),
    outfitCombinations: [],
    customerInsight: `${customer?.tier || 'Standard'} member with ${customer?.visitCount ?? 0} visit${customer?.visitCount !== 1 ? 's' : ''}. ${customer?.preferences?.notes || ''}`.trim(),
    icebreakers: [
      "Welcome! I've been looking forward to our session today.",
      `I noticed you're interested in ${task?.item || 'our latest collection'} — I have some great options lined up.`,
    ],
  };
};

export async function getSessionPrep({ customer, task, products }) {
  if (!isAgentEnabled()) {
    return localSessionPrep({ customer, task, products });
  }

  try {
    const result = await callAgentJson({
      maxTokens: 1000,
      system: [
        {
          type: 'text',
          text: `You are an expert luxury retail stylist preparing for a live shopping session.
Given a customer profile, task details, and available products, return a JSON prep briefing.
Return JSON only — no markdown, no explanation:
{
  "sessionGoal": "one sentence goal for this session",
  "talkingPoints": ["string", "string", "string"],
  "productFocus": [{"name":"string","sku":"string","reason":"string"}],
  "outfitCombinations": [{"name":"string","items":["string"],"occasion":"string"}],
  "customerInsight": "1–2 sentence insight for the stylist",
  "icebreakers": ["string", "string"]
}`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: JSON.stringify({
            customer: {
              name: customer?.name,
              tier: customer?.tier,
              ltv: customer?.ltv,
              visitCount: customer?.visitCount,
              loyaltyPoints: customer?.loyaltyPoints,
              preferences: customer?.preferences,
              recentPurchases: (customer?.recentPurchases || []).slice(0, 5),
            },
            task: {
              type: task?.type,
              urgency: task?.urgency,
              item: task?.item,
              location: task?.location,
            },
            availableProducts: products.slice(0, 12).map((p) => ({
              name: p.name,
              sku: p.sku || p.id,
              category: p.category,
              price: p.price,
            })),
          }),
        },
      ],
    });

    if (!result?.sessionGoal) return localSessionPrep({ customer, task, products });

    return {
      sessionGoal: result.sessionGoal,
      talkingPoints: Array.isArray(result.talkingPoints) ? result.talkingPoints : [],
      productFocus: Array.isArray(result.productFocus) ? result.productFocus.slice(0, 4) : [],
      outfitCombinations: Array.isArray(result.outfitCombinations) ? result.outfitCombinations.slice(0, 3) : [],
      customerInsight: result.customerInsight || '',
      icebreakers: Array.isArray(result.icebreakers) ? result.icebreakers.slice(0, 3) : [],
    };
  } catch (_err) {
    return localSessionPrep({ customer, task, products });
  }
}
