const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const { checkAdminInteraction } = require('../../utils/adminCheck');
const { checkAllAccounts } = require('../../services/socialNotifierService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('social-check-now')
    .setDescription('Manually trigger an immediate social media check'),

  async execute(interaction, client) {
    if (!await checkAdminInteraction(interaction)) return;
    await interaction.deferReply({ ephemeral: true });
    try {
      await checkAllAccounts(client);
      return interaction.editReply({ embeds: [embeds.success('Social check complete! Any new posts have been sent to the notification channel.')] });
    } catch (err) {
      return interaction.editReply({ embeds: [embeds.error(`Check failed: ${err.message}`)] });
    }
  },
};
