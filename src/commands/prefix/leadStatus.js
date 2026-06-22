const { checkAdminMessage } = require('../../utils/adminCheck');
const { setLeadStatus, findLead } = require('../../services/leadService');
const auditLog = require('../../services/auditLogService');
const embeds = require('../../utils/embeds');

const VALID_STATUSES = ['new', 'warm', 'hot', 'closed', 'ignored'];

module.exports = {
  name: 'leadstatus',
  aliases: ['lead-status'],
  description: 'Update a lead\'s status',
  usage: '!leadstatus <@user|id> <status>',
  adminOnly: true,

  async execute(message, args) {
    if (!await checkAdminMessage(message)) return;

    const [query, status] = args;
    if (!query || !status) {
      return message.reply({
        embeds: [embeds.error(`**Usage:** \`!leadstatus <@user|id> <status>\`\n**Valid statuses:** ${VALID_STATUSES.join(', ')}`)],
      });
    }

    if (!VALID_STATUSES.includes(status.toLowerCase())) {
      return message.reply({ embeds: [embeds.error(`Invalid status. Choose from: **${VALID_STATUSES.join(', ')}**`)] });
    }

    const lead = await findLead(message.guild.id, query);
    if (!lead) return message.reply({ embeds: [embeds.error(`No lead found for: **${query}**`)] });

    await setLeadStatus(message.guild.id, lead.userId, status.toLowerCase());

    await auditLog.log({
      guildId: message.guild.id, adminId: message.author.id,
      action: 'SET_LEAD_STATUS', target: lead.userId,
      details: `${lead.status} → ${status.toLowerCase()}`,
    });

    await message.reply({
      embeds: [embeds.success(`Updated **${lead.username}**'s status to **${status.toLowerCase()}**.`)],
    });
  },
};
