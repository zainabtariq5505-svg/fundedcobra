const logger = require('../utils/logger');
const { recordLeave } = require('../services/inviteService');

module.exports = {
  name: 'guildMemberRemove',
  once: false,

  async execute(member, client) {
    try {
      await recordLeave(member.guild, member, client);
    } catch (err) {
      logger.error(`guildMemberRemove invite tracking failed for ${member?.id || 'unknown'}:`, err);
    }
  },
};
