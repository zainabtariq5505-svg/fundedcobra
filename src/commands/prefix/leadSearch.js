const { checkAdminMessage } = require('../../utils/adminCheck');
const { searchLeads } = require('../../services/leadService');
const { EmbedBuilder } = require('discord.js');
const { COLORS, FOOTER, truncate } = require('../../utils/embeds');
const { timeAgo } = require('../../utils/formatDate');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'leadsearch',
  aliases: ['lead-search'],
  description: 'Search leads by username or keyword',
  usage: '!leadsearch <keyword>',
  adminOnly: true,

  async execute(message, args) {
    if (!await checkAdminMessage(message)) return;

    const keyword = args.join(' ').trim();
    if (!keyword) return message.reply({ embeds: [embeds.error('Please provide a search keyword.\n**Usage:** `!leadsearch forex`')] });

    const leads = await searchLeads(message.guild.id, keyword);

    if (leads.length === 0) {
      return message.reply({ embeds: [embeds.info(`No leads found matching **"${keyword}"**`)] });
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.PURPLE)
      .setTitle(`Lead Search: "${keyword}" — ${leads.length} result(s)`)
      .setFooter(FOOTER)
      .setTimestamp();

    for (const lead of leads.slice(0, 10)) {
      embed.addFields({
        name: `${lead.username} (${lead.status.toUpperCase()}) · Score: ${lead.score}`,
        value: [
          `ID: \`${lead.userId}\` · Last active: ${timeAgo(lead.updatedAt)}`,
          lead.lastQuestion ? truncate(lead.lastQuestion, 100) : '',
        ].filter(Boolean).join('\n'),
        inline: false,
      });
    }

    await message.reply({ embeds: [embed] });
  },
};
