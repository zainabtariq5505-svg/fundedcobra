/**
 * Simple keyword-based intent detection.
 * Determines what category of question the user is asking.
 */

const INTENT_PATTERNS = [
  {
    intent: 'pricing',
    keywords: ['price', 'cost', 'how much', 'fee', 'buy', 'purchase', 'coupon', 'discount', 'code', 'cobra50'],
  },
  {
    intent: 'payout',
    keywords: ['payout', 'pay out', 'withdrawal', 'withdraw', 'payment', 'profit split', 'split', 'receive money', 'get paid', 'crypto', 'usdt', 'bitcoin', 'paypal', 'bank wire', 'wise', 'skrill'],
  },
  {
    intent: 'challenge',
    keywords: ['challenge', 'evaluation', 'phase', 'pass', 'fail', 'retry', 'one phase', 'two phase', 'lightning', 'instant funding', 'funded account', 'get funded', 'evaluation period'],
  },
  {
    intent: 'rules',
    keywords: ['rule', 'drawdown', 'daily drawdown', 'max drawdown', 'news trading', 'ea', 'expert advisor', 'scalping', 'hedging', 'copy trading', 'overnight', 'weekend', 'leverage', 'martingale', 'arbitrage', 'latency', 'prohibited', 'allowed', 'restriction', 'holding'],
  },
  {
    intent: 'account',
    keywords: ['account size', 'account balance', 'multiple accounts', 'scaling', 'scale', 'upgrade', '$10k', '$25k', '$50k', '$100k', '$200k', 'allocation', 'capital', 'funded'],
  },
  {
    intent: 'refund',
    keywords: ['refund', 'money back', 'cancel', 'refund policy', 'guarantee', '14 day', '14-day'],
  },
  {
    intent: 'platform',
    keywords: ['platform', 'metatrader', 'mt4', 'mt5', 'ctrader', 'tradelocker', 'match-trader', 'dxtrade', 'trading platform'],
  },
  {
    intent: 'instruments',
    keywords: ['forex', 'gold', 'xauusd', 'indices', 'nas100', 'us30', 'spx500', 'dax', 'crypto', 'oil', 'commodities', 'stocks', 'pairs', 'instruments', 'what can i trade'],
  },
  {
    intent: 'verification',
    keywords: ['kyc', 'verify', 'verification', 'id', 'identity', 'document', 'passport', 'proof of address', 'kyc process'],
  },
  {
    intent: 'support',
    keywords: ['help', 'support', 'contact', 'email', 'discord', 'chat', 'how do i', 'how can i', 'where do i', 'issue', 'problem', 'trouble'],
  },
  {
    intent: 'complaint',
    keywords: ['complaint', 'scam', 'fraud', 'unfair', 'cheat', 'cheated', 'lie', 'wrong', 'dispute', 'disagree'],
  },
  {
    intent: 'objection',
    keywords: [
      'is this legit', 'is payout real', 'can i trust you', 'any proof', 'why fundedcobra',
      'proof of payout', 'reviews', 'testimonials', 'is this a scam', 'legit?', 'real?',
    ],
  },
];

const LEAD_INTENTS = new Set([
  'pricing', 'payout', 'challenge', 'account', 'refund', 'verification',
]);

const LEAD_KEYWORDS = [
  'price', 'cost', 'how much', 'fee', 'buy', 'purchase',
  'payout', 'profit split', 'funded account', 'get funded',
  'challenge', 'drawdown', 'scaling', 'verification', 'kyc',
  'refund', 'discount', 'coupon', 'instant funding',
  'daily payout', 'minimum trading days', 'account size',
  'payment method', 'profit target',
];

/**
 * Detects the primary intent of a user's question.
 * @param {string} text
 * @returns {string} Intent label
 */
function detectIntent(text) {
  if (!text) return 'general';
  const lower = text.toLowerCase();

  for (const { intent, keywords } of INTENT_PATTERNS) {
    if (keywords.some(kw => lower.includes(kw))) return intent;
  }

  return 'general';
}

/**
 * Returns true if the question suggests a potential lead (buying intent).
 * @param {string} text
 * @param {string} intent
 */
function isLeadQuestion(text, intent) {
  if (LEAD_INTENTS.has(intent)) return true;
  if (!text) return false;
  const lower = text.toLowerCase();
  return LEAD_KEYWORDS.some(kw => lower.includes(kw));
}

/**
 * Calculates a simple lead score (0–100) based on intent.
 * @param {string} intent
 * @param {boolean} isLead
 */
function scoreIntent(intent, isLead) {
  if (!isLead) return 0;
  const scores = {
    pricing: 90, refund: 85, challenge: 80, payout: 75,
    account: 70, verification: 65, instruments: 40, rules: 50,
    platform: 40, support: 20, complaint: 10, objection: 35, general: 10,
  };
  return scores[intent] ?? 20;
}

module.exports = { detectIntent, isLeadQuestion, scoreIntent };
