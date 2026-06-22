const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkAdminInteraction } = require('../../utils/adminCheck');
const { findLead } = require('../../services/leadService');
const { COLORS, FOOTER, truncate } = require('../../utils/embeds');
const { formatDate, timeAgo } = require('../../utils/formatDate');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lead')
    .setDescription('View a specific lead profile (Admin only)')
    .addUserOption(opt =>
      opt.setName('user')
         .setDescription('The Discord user')
         .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('id')
         .setDescription('User ID (if user is not in the server)')
         .setRequired(false)
    ),
  deferred: true,
  adminOnly: true,

  async execute(interaction) {
    if (!await checkAdminInteraction(interaction)) return;

    const user    = interaction.options.getUser('user');
    const idInput = interaction.options.getString('id');
    const query   = user?.id || idInput;

    if (!query) {
      return interaction.editReply({ embeds: [embeds.error('Please provide a user or user ID.')] });
    }

    const lead = await findLead(interaction.guild.id, query);
    if (!lead) return interaction.editReply({ embeds: [embeds.error(`No lead found for: **${query}**`)] });

    const statusColors = { hot: COLORS.RED, warm: COLORS.GOLD, new: COLORS.PRIMARY, closed: COLORS.GREEN, ignored: COLORS.GREY };
    const embed = new EmbedBuilder()
      .setColor(statusColors[lead.status] || COLORS.PRIMARY)
      .setTitle(`Lead: ${lead.username}`)
      .addFields(
        { name: 'User ID',   value: `\`${lead.userId}\``,              inline: true },
        { name: 'Status',    value: `**${lead.status.toUpperCase()}**`, inline: true },
        { name: 'Score',     value: `${lead.score}/100`,                inline: true },
        { name: 'Intent',    value: lead.intentSummary || 'N/A',       inline: true },
        { name: 'Is Lead',   value: lead.isLead ? '✅ Yes' : '❌ No',  inline: true },
        { name: 'First Seen',value: timeAgo(lead.createdAt),           inline: true },
      )
      .setFooter(FOOTER)
      .setTimestamp();

    if (lead.firstQuestion) embed.addFields({ name: 'First Question', value: truncate(lead.firstQuestion, 300) });
    if (lead.lastQuestion && lead.lastQuestion !== lead.firstQuestion) {
      embed.addFields({ name: 'Last Question', value: truncate(lead.lastQuestion, 300) });
    }
    if (lead.notes.length > 0) {
      embed.addFields({
        name: `Admin Notes (${lead.notes.length})`,
        value: lead.notes.slice(0, 5).map(n => `• ${n.note}`).join('\n'),
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
