const logger = require('../utils/logger');
const { handleNewBoost } = require('../services/boosterService');

// Track recently processed boosts to prevent duplicate messages (in-memory, resets on restart)
const recentBoosts = new Set();

module.exports = {
  name: 'guildMemberUpdate',
  once: false,

  async execute(oldMember, newMember, client) {
    // Ignore bots
    if (newMember.user?.bot) return;

    // Detect new boost: premiumSince was null, now it is set
    const wasNotBoosting = !oldMember.premiumSince;
    const isNowBoosting = !!newMember.premiumSince;

    if (wasNotBoosting && isNowBoosting) {
      const dedupeKey = `${newMember.guild.id}:${newMember.id}:${newMember.premiumSince?.getTime()}`;

      if (recentBoosts.has(dedupeKey)) return;
      recentBoosts.add(dedupeKey);
      // Clean up dedup key after 10 minutes
      setTimeout(() => recentBoosts.delete(dedupeKey), 10 * 60 * 1000);

      try {
        await handleNewBoost(newMember, client);
      } catch (err) {
        logger.error(`guildMemberUpdate booster handling failed for ${newMember?.id || 'unknown'}:`, err);
      }
    }
  },
};
