const { checkAdminMessage } = require('../../utils/adminCheck');
const { findLead } = require('../../services/leadService');
const { EmbedBuilder } = require('discord.js');
const { COLORS, FOOTER, truncate } = require('../../utils/embeds');
const { formatDate, timeAgo } = require('../../utils/formatDate');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'lead',
  description: 'View a specific lead profile',
  usage: '!lead <@user or user ID>',
  adminOnly: true,

  async execute(message, args) {
    if (!await checkAdminMessage(message)) return;

    const query = args[0];
    if (!query) return message.reply({ embeds: [embeds.error('Please provide a user mention or ID.\n**Usage:** `!lead @username`')] });

    const lead = await findLead(message.guild.id, query);
    if (!lead) {
      return message.reply({ embeds: [embeds.error(`No lead found for: **${query}**`)] });
    }

    const statusColors = { hot: COLORS.RED, warm: COLORS.GOLD, new: COLORS.PRIMARY, closed: COLORS.GREEN, ignored: COLORS.GREY };
    const embed = new EmbedBuilder()
      .setColor(statusColors[lead.status] || COLORS.PRIMARY)
      .setTitle(`Lead Profile: ${lead.username}`)
      .addFields(
        { name: 'User ID',     value: `\`${lead.userId}\``,               inline: true },
        { name: 'Status',      value: `**${lead.status.toUpperCase()}**`,  inline: true },
        { name: 'Score',       value: `${lead.score}/100`,                 inline: true },
        { name: 'Display Name',value: lead.displayName || 'N/A',          inline: true },
        { name: 'Intent',      value: lead.intentSummary || 'unknown',    inline: true },
        { name: 'Is Lead',     value: lead.isLead ? '✅ Yes' : '❌ No',   inline: true },
        { name: 'First Seen',  value: formatDate(lead.createdAt),          inline: false },
        { name: 'Last Active', value: `${timeAgo(lead.updatedAt)}`,        inline: false },
      )
      .setFooter(FOOTER)
      .setTimestamp();

    if (lead.firstQuestion) {
      embed.addFields({ name: 'First Question', value: truncate(lead.firstQuestion, 300), inline: false });
    }
    if (lead.lastQuestion && lead.lastQuestion !== lead.firstQuestion) {
      embed.addFields({ name: 'Last Question', value: truncate(lead.lastQuestion, 300), inline: false });
    }
    if (lead.notes.length > 0) {
      embed.addFields({
        name: `Admin Notes (${lead.notes.length})`,
        value: lead.notes.slice(0, 5).map(n => `• ${n.note}`).join('\n'),
        inline: false,
      });
    }

    await message.reply({ embeds: [embed] });
  },
};
