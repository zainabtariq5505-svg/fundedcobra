const { checkAdminMessage } = require('../../utils/adminCheck');
const { getLeads } = require('../../services/leadService');
const { EmbedBuilder } = require('discord.js');
const { COLORS, FOOTER, truncate } = require('../../utils/embeds');
const { timeAgo } = require('../../utils/formatDate');
const embeds = require('../../utils/embeds');

const STATUS_EMOJI = { hot: '🔥', warm: '🟡', new: '🆕', closed: '✅', ignored: '⚫' };

module.exports = {
  name: 'leads',
  description: 'View leads — optionally filter by status',
  usage: '!leads [hot|warm|new|closed|ignored]',
  adminOnly: true,

  async execute(message, args) {
    if (!await checkAdminMessage(message)) return;

    const statusFilter = args[0]?.toLowerCase();
    const validStatuses = ['hot', 'warm', 'new', 'closed', 'ignored'];
    if (statusFilter && !validStatuses.includes(statusFilter)) {
      return message.reply({ embeds: [embeds.error(`Invalid status. Use one of: ${validStatuses.join(', ')}`)] });
    }

    const leads = await getLeads(message.guild.id, { status: statusFilter, limit: 20 });

    if (leads.length === 0) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.ORANGE)
          .setTitle('Leads')
          .setDescription(statusFilter ? `No ${statusFilter} leads found.` : 'No leads found yet.')
          .setFooter(FOOTER)],
      });
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.PURPLE)
      .setTitle(`${statusFilter ? `${STATUS_EMOJI[statusFilter]} ${statusFilter.toUpperCase()} Leads` : 'All Leads'} (${leads.length})`)
      .setFooter(FOOTER)
      .setTimestamp();

    for (const lead of leads) {
      const emoji = STATUS_EMOJI[lead.status] || '❓';
      embed.addFields({
        name: `${emoji} ${lead.username} (Score: ${lead.score})`,
        value: [
          `ID: \`${lead.userId}\` · Status: **${lead.status}**`,
          `Intent: ${lead.intentSummary || 'unknown'} · Last seen: ${timeAgo(lead.updatedAt)}`,
          lead.lastQuestion ? `Last Q: ${truncate(lead.lastQuestion, 80)}` : '',
        ].filter(Boolean).join('\n'),
        inline: false,
      });
    }

    await message.reply({ embeds: [embed] });
  },
};
