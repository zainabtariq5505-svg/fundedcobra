const { SlashCommandBuilder } = require('discord.js');
const { checkAdminInteraction } = require('../../utils/adminCheck');
const { collectStats } = require('../../services/dashboardService');
const { buildDashboardEmbeds, buildRefreshButton } = require('../prefix/dashboard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('Show the FundedCobra server health dashboard (Admin only)'),
  deferred: true,
  adminOnly: true,

  async execute(interaction) {
    if (!await checkAdminInteraction(interaction)) return;
    const stats = await collectStats(interaction.guild.id, interaction.client);
    const embed = buildDashboardEmbeds(stats);
    const row = buildRefreshButton(interaction.guild.id);
    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};
