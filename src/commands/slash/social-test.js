const { SlashCommandBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { checkAdminInteraction } = require('../../utils/adminCheck');
const { sendTestNotification } = require('../../services/socialNotifierService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('social-test')
    .setDescription('Send a test notification for a social account')
    .addStringOption(o => o.setName('id').setDescription('Account ID (last 8 chars from /social-list)').setRequired(true)),

  async execute(interaction, client) {
    if (!await checkAdminInteraction(interaction)) return;
    await interaction.deferReply({ ephemeral: true });
    const id = interaction.options.getString('id');
    const account = await prisma.socialAccount.findFirst({ where: { guildId: interaction.guild.id, OR: [{ id }, { id: { endsWith: id } }] } });
    if (!account) return interaction.editReply({ embeds: [embeds.error('Account not found.')] });

    try {
      await sendTestNotification(client, account);
      return interaction.editReply({ embeds: [embeds.success('Test notification sent!')] });
    } catch (err) {
      return interaction.editReply({ embeds: [embeds.error(`Test failed: ${err.message}`)] });
    }
  },
};
