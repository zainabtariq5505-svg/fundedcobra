const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkAdminInteraction } = require('../../utils/adminCheck');
const { searchLeads } = require('../../services/leadService');
const { COLORS, FOOTER, truncate } = require('../../utils/embeds');
const { timeAgo } = require('../../utils/formatDate');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leadsearch')
    .setDescription('Search leads by username, question, or keyword (Admin only)')
    .addStringOption(opt =>
      opt.setName('keyword')
         .setDescription('Search keyword')
         .setRequired(true)
         .setMaxLength(100)
    ),
  deferred: true,
  adminOnly: true,

  async execute(interaction) {
    if (!await checkAdminInteraction(interaction)) return;

    const keyword = interaction.options.getString('keyword');
    const leads   = await searchLeads(interaction.guild.id, keyword);

    if (leads.length === 0) {
      return interaction.editReply({ embeds: [embeds.info(`No leads matching **"${keyword}"**`)] });
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.PURPLE)
      .setTitle(`Lead Search: "${keyword}" — ${leads.length} result(s)`)
      .setFooter(FOOTER)
      .setTimestamp();

    for (const lead of leads.slice(0, 10)) {
      embed.addFields({
        name: `${lead.username} · ${lead.status.toUpperCase()} · Score: ${lead.score}`,
        value: [
          `ID: \`${lead.userId}\` · ${timeAgo(lead.updatedAt)}`,
          lead.lastQuestion ? truncate(lead.lastQuestion, 100) : '',
        ].filter(Boolean).join('\n'),
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
