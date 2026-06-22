/**
 * Seeds the knowledge base with FundedCobra's official rules and FAQ.
 * Run this after initial setup to populate the bot's knowledge base.
 *
 * Usage: node src/scripts/seed.js
 */

require('../config/env');
const { importFromText } = require('../services/ruleImportService');
const prisma = require('../database/prisma');

const SEED_ADMIN_ID = 'SYSTEM_SEED';

const knowledgeEntries = [
  {
    title: 'FundedCobra — Overview',
    content: `FundedCobra is a forex prop trading firm that provides traders with funded accounts of up to $200,000.
We have 85,000+ funded traders across 127 countries. Total paid out: $47M+.
Average payout speed: 24 hours (most within 4 hours).
Get funded in days, not months.
Account portal: https://account.fundedcobra.com/
Support email: support@fundedcobra.com
Website: https://www.fundedcobra.com`,
  },
  {
    title: 'Challenge Programs — One Phase',
    content: `One Phase Challenge:
- Account sizes: $10K, $25K, $50K, $100K, $200K
- Profit target: 10%
- Max drawdown: 10% (trailing from equity peak)
- Daily drawdown: 5% of daily opening balance
- Min trading days: None
- Time limit: Unlimited
- Free retry on first failure: Yes
- Fee refunded on first payout: Yes
- Profit split starts at: 80%, scales to 90%

Pricing:
- $10K account: $79
- $25K account: $159
- $50K account: $299
- $100K account: $549
- $200K account: $949`,
  },
  {
    title: 'Challenge Programs — Two Phase',
    content: `Two Phase Challenge:
- Account sizes: $10K, $25K, $50K, $100K, $200K
- Phase 1 profit target: 8%
- Phase 2 profit target: 5%
- Max drawdown: 10% (trailing)
- Daily drawdown: 5%
- Min trading days: None
- Time limit: Unlimited
- Free retry on first failure: Yes
- Fee refunded on first payout: Yes
- Payout frequency: Bi-weekly

Pricing:
- $10K account: $59
- $25K account: $109
- $50K account: $199
- $100K account: $359
- $200K account: $659`,
  },
  {
    title: 'Challenge Programs — Instant Funding',
    content: `Instant Funding:
- No evaluation required — start trading a live funded account immediately
- Account sizes: $10K, $25K, $50K, $100K
- Max drawdown: 8%
- Daily drawdown: 5%
- No profit target
- Profit split: starts at 70%, scales to 80%
- Payout frequency: Weekly
- Scaling available

Pricing:
- $10K account: $199
- $25K account: $399
- $50K account: $749
- $100K account: $1,299`,
  },
  {
    title: 'Challenge Programs — Lightning Challenge',
    content: `Lightning Challenge (lowest prices, higher targets):
- Account sizes: $10K, $25K, $50K, $100K, $200K
- Phase 1 profit target: 15% (21-day limit)
- Phase 2 profit target: 10% (14-day limit)
- Max drawdown: 8%
- Daily drawdown: 4%
- Min trading days: None
- No free retry (retry add-ons available)
- Fee refunded on pass: Yes (Phase 1 only)

Pricing:
- $10K account: $49
- $25K account: $99
- $50K account: $179
- $100K account: $329
- $200K account: $599`,
  },
  {
    title: 'Add-Ons and Upgrades',
    content: `Available add-ons at checkout:

1. Profit Split Booster (+$29): Unlock 90% profit split from day one.
2. 1-Day Payout Unlock (+$39): Remove minimum trading day requirement, request payouts from day 1.
3. Drawdown Shield (+$49): Expand daily drawdown from 5% to 8% on One Phase / Two Phase accounts.

These add-ons are purchased at checkout and apply for the duration of the account.`,
  },
  {
    title: 'Trading Rules — Allowed Strategies',
    content: `FundedCobra allows the following trading strategies on all challenge types and funded accounts:

ALLOWED:
- News trading: All major news events allowed including NFP, CPI, FOMC announcements. No restrictions.
- Expert Advisors (EAs): All automated strategies allowed except high-frequency latency arbitrage.
- Copy trading: Signal copying and mirror trading fully permitted.
- Overnight holding: Hold positions overnight with no restrictions.
- Weekend holding: Positions can be held over the weekend. Be mindful of gap risk and swap costs.
- Scalping: Any holding period is allowed — from 1-second scalps to multi-week positions. No minimum trade duration.
- Hedging: Open simultaneous long and short positions within the same account.
- Grid bots: Grid trading strategies are permitted.`,
  },
  {
    title: 'Trading Rules — Prohibited Activities',
    content: `The following activities are PROHIBITED and will result in account termination:

PROHIBITED:
1. Latency arbitrage: High-frequency strategies that exploit data feed latency or price differences between brokers. These are strictly banned.
2. Account sharing: Only the registered account holder may trade the account. Sharing credentials is not permitted.
3. Strategy coordination: Coordinating with other traders to split risk across accounts and artificially pass challenges is prohibited.
4. Martingale gambling: Pure martingale strategies with unlimited doubling down designed to force a win are not allowed on funded accounts.
5. Exceeding max drawdown: Breaching the maximum drawdown limit results in immediate account termination. This rule cannot be altered by any add-on.`,
  },
  {
    title: 'Drawdown Rules — Explanation',
    content: `Understanding drawdown rules at FundedCobra:

MAX DRAWDOWN (Account Drawdown):
- Calculated from the highest equity peak at any point during the challenge.
- This is a trailing drawdown (follows your highest equity).
- Example: Starting balance $100,000. Peak equity reached: $105,000. Max drawdown (10%) = $10,500. Account breached if equity falls below $94,500 ($105,000 - $10,500).

DAILY DRAWDOWN:
- Resets every day at 00:00 server time (UTC+2).
- Based on your equity at the start of each trading day.
- Example: Equity at 00:00 = $102,000. Daily drawdown limit (5%) = $5,100. Account breached if equity falls below $96,900 that day. Resets at midnight — next day starts fresh.

Daily drawdown limits by challenge type:
- One Phase: 5%
- Two Phase: 5%
- Instant Funding: 5%
- Lightning Challenge: 4%
With Drawdown Shield add-on: 8% daily (One/Two Phase only)`,
  },
  {
    title: 'Funded Account Rules',
    content: `Rules for funded accounts (after passing the challenge):

- Max drawdown: 10% of account balance (trailing)
- Daily drawdown: 5% of daily opening balance
- Profit split starting: 80%
- Profit split maximum: 90%
- Payout frequency: On-demand (request any time you are profitable)
- Min payout amount: None (no minimum)
- Max account size via scaling: $2,000,000
- Scaling trigger: Every 10% profit milestone
- Scale amount: +40% of current account size
- Multiple accounts: Yes, up to $600K combined allocation`,
  },
  {
    title: 'Leverage Limits',
    content: `Maximum leverage by instrument:

Forex pairs:
- One Phase, Two Phase, Lightning: 1:100
- Instant Funding: 1:50

Indices (US30, SPX500, NAS100, DAX40, etc.):
- One Phase, Two Phase, Lightning: 1:30
- Instant Funding: 1:20

Commodities (Gold, Silver, Oil):
- Standard: 1:20

Crypto (BTC, ETH, altcoins):
- One Phase, Two Phase, Lightning: 1:10
- Instant Funding: 1:5

Stocks (CFDs):
- All accounts: 1:5

Energy & Metals:
- All accounts: 1:15`,
  },
  {
    title: 'Tradeable Instruments',
    content: `FundedCobra supports trading the following instruments:

Forex:
- All major currency pairs (EURUSD, GBPUSD, USDJPY, etc.)
- All minor pairs
- Exotic pairs

Indices:
- US30 (Dow Jones), SPX500 (S&P 500), NAS100 (Nasdaq)
- DAX40, FTSE100
- Nikkei, ASX200

Commodities:
- Gold (XAUUSD), Silver (XAGUSD)
- Oil (WTI & Brent crude)
- Natural Gas, Copper

Crypto:
- Bitcoin (BTC), Ethereum (ETH)
- Major altcoins

Stocks (CFDs):
- 200+ individual US and EU stocks
- US Tech giants, EU Blue chips

Energy & Metals:
- Natural Gas, Palladium, Platinum`,
  },
  {
    title: 'Scaling Program',
    content: `FundedCobra Scaling Program:

How it works:
- Every time you achieve a 10% profit on your funded account, your account size increases by 40%.
- Start at $10K, grow up to $2,000,000.
- No cap on total earnings.
- Profit split also increases as you scale.

Example progression from $50K account:
$50K → $70K → $98K → $137K → ... → $200,000+

You can hold up to $600K combined across multiple funded accounts.`,
  },
  {
    title: 'Payout System',
    content: `FundedCobra payout system:

Speed:
- Payouts processed within 24 hours of request.
- Most traders receive funds within 4 hours.
- Crypto payouts (USDT, Bitcoin, Ethereum) are fastest.
- Bank wires: 1-3 business days depending on your bank.

Payment methods:
- Cryptocurrency: USDT/TRC20, Bitcoin, Ethereum
- Bank Wire Transfer
- PayPal
- Skrill
- Wise

Profit split:
- Starts at 80% of your profits.
- Increases to 85% after first $5K profit milestone.
- Increases to 90% after first $15K profit milestone.
- Profit Split Booster add-on unlocks 90% from day one.

No minimum payout amount. No maximum payout cap.
First challenge fee is refunded on your first payout as a funded trader.`,
  },
  {
    title: 'Refund and Cancellation Policy',
    content: `FundedCobra refund policy:

- 14-day money-back guarantee if you have NOT started trading.
- Once you place your first trade, the evaluation fee is non-refundable.
- Your challenge fee is refunded automatically when you receive your first payout as a funded trader (One Phase and Two Phase challenges).
- Lightning Challenge fee refunded after passing Phase 1.
- Instant Funding accounts: no evaluation fee refund (you receive a live account immediately).

For refund requests, contact: support@fundedcobra.com`,
  },
  {
    title: 'KYC and Verification',
    content: `KYC (Know Your Customer) verification at FundedCobra:

- KYC verification is required before your FIRST payout.
- You do not need to complete KYC before trading.
- Required documents: Government-issued photo ID + proof of address.
- Processing time: typically less than 24 hours.
- KYC is required only once per account.
- After verification, future payouts process without additional KYC steps.`,
  },
  {
    title: 'Trading Platforms',
    content: `Supported trading platforms at FundedCobra:

- MetaTrader 4 (MT4)
- MetaTrader 5 (MT5)
- cTrader
- TradeLocker
- Match-Trader

All platforms are available for both evaluation and funded accounts.
You choose your preferred platform at checkout.
Platform credentials are provided immediately after purchase.`,
  },
  {
    title: 'Multiple Accounts',
    content: `Multiple funded accounts at FundedCobra:

- You can hold multiple funded accounts simultaneously.
- Maximum combined allocation: $600,000 across all accounts.
- Each account trades independently with its own drawdown rules.
- Allows diversification across different strategies and account sizes.
- You can run different challenge types simultaneously (e.g., One Phase + Two Phase).`,
  },
  {
    title: 'FAQ — Challenges',
    content: `Frequently Asked Questions — Challenges:

Q: What is a FundedCobra challenge?
A: A simulated trading evaluation. Hit the profit target while staying within drawdown rules, and we provide a real funded account where you keep up to 90% of profits.

Q: How long do I have to complete the challenge?
A: Most challenges are unlimited time — no deadline. Exception: Lightning Challenge has a 21-day Phase 1 limit and 14-day Phase 2 limit.

Q: What happens if I fail?
A: One Phase and Two Phase include a free retry on first failure. Lightning Challenge does not include free retries but you can purchase retry add-ons.

Q: Is there a minimum trading day requirement?
A: No. No minimum trading days on any FundedCobra challenge.

Q: Can I use a discount code?
A: Yes. Current offer: use code COBRA50 for 50% off all challenges at checkout.`,
  },
  {
    title: 'FAQ — Payouts',
    content: `Frequently Asked Questions — Payouts:

Q: How fast are payouts?
A: Within 24 hours. Most traders receive funds within 4 hours.

Q: Is there a minimum payout amount?
A: No minimum payout amount. No maximum cap either.

Q: What payment methods are available?
A: Cryptocurrency (USDT/TRC20, Bitcoin, Ethereum), Bank Wire, PayPal, Skrill, Wise.

Q: How does the profit split work?
A: Starts at 80%. Goes to 85% after $5K profit milestone, 90% after $15K. Profit Split Booster unlocks 90% from day one.

Q: When is the first payout available?
A: You can request a payout any time you are in profit on your funded account. No waiting period unless you have daily trading day minimums (which most plans don't have).`,
  },
  {
    title: 'FAQ — Rules',
    content: `Frequently Asked Questions — Trading Rules:

Q: Is news trading allowed?
A: Yes. All news events allowed — NFP, CPI, FOMC, everything. No restrictions.

Q: Are EAs and automated strategies allowed?
A: Yes. All EAs except high-frequency latency arbitrage bots.

Q: Can I hold trades overnight or over the weekend?
A: Yes. No restrictions on holding overnight or over weekends.

Q: What is the daily drawdown rule exactly?
A: Based on equity at start of each trading day (00:00 UTC+2). One/Two Phase: 5%. Lightning: 4%. Drawdown Shield add-on: 8%.

Q: Can I use copy trading?
A: Yes. Copy trading and signal following are fully permitted.

Q: Is scalping allowed?
A: Yes. Any holding period allowed — from 1-second scalps to multi-week positions.`,
  },
  {
    title: 'Contact and Support',
    content: `FundedCobra support channels:

Email: support@fundedcobra.com (reply within 4 hours)
Live chat: Available at account.fundedcobra.com (average 8-minute response)
Discord: Join the community at fundedcobra.com (12,000+ traders)

Website: https://www.fundedcobra.com/
Account portal: https://account.fundedcobra.com/

Available 24/7 support.`,
  },
];

async function seed() {
  console.log('🌱 Seeding FundedCobra knowledge base...\n');

  // Run migrations if needed
  try {
    await prisma.$executeRaw`SELECT 1`;
  } catch (err) {
    console.error('Database not ready. Run: npm run db:migrate');
    process.exit(1);
  }

  let total = 0;
  let skipped = 0;

  for (const entry of knowledgeEntries) {
    try {
      const { source, chunksCreated, skipped: isSkipped } = await importFromText(
        entry.content, entry.title, SEED_ADMIN_ID
      );
      if (isSkipped) {
        console.log(`  ⏭  Skipped (unchanged): ${entry.title}`);
        skipped++;
      } else {
        console.log(`  ✓  Imported: ${entry.title} — ${chunksCreated} chunk(s)`);
        total += chunksCreated;
      }
    } catch (err) {
      console.error(`  ✗  Failed: ${entry.title} — ${err.message}`);
    }
  }

  console.log(`\n✅ Seed complete. ${knowledgeEntries.length - skipped} entries imported, ${total} total chunks.`);
  console.log(`   ${skipped} entries were already up-to-date.\n`);

  await prisma.$disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
