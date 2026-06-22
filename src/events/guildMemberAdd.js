const logger = require('../utils/logger');
const { sendWelcomeForMember } = require('../services/welcomeService');
const { recordJoin, initializeGuildInvites } = require('../services/inviteService');
const { assignAutoRole } = require('../services/autoRoleService');

module.exports = {
  name: 'guildMemberAdd',
  once: false,

  async execute(member, client) {
    try {
      await sendWelcomeForMember(member);
    } catch (err) {
      logger.error(`guildMemberAdd welcome failed for ${member?.id || 'unknown'}:`, err);
    }

    try {
      await recordJoin(member.guild, member, client);
    } catch (err) {
      logger.error(`guildMemberAdd invite tracking failed for ${member?.id || 'unknown'}:`, err);
    }

    try {
      await assignAutoRole(member, client);
    } catch (err) {
      logger.error(`guildMemberAdd auto role failed for ${member?.id || 'unknown'}:`, err);
    }
  },
};