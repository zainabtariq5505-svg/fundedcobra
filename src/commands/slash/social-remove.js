const { SlashCommandBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { checkAdminInteraction } = require('../../utils/adminCheck');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('social-remove')
    .setDescription('Remove a monitored social account')
    .addStringOption(o => o.setName('id').setDescription('Account ID (last 8 chars from /social-list)').setRequired(true)),

  async execute(interaction) {
    if (!await checkAdminInteraction(interaction)) return;
    const id = interaction.options.getString('id');
    const account = await prisma.socialAccount.findFirst({ where: { guildId: interaction.guild.id, OR: [{ id }, { id: { endsWith: id } }] } });
    if (!account) return interaction.reply({ embeds: [embeds.error('Account not found.')], ephemeral: true });
    await prisma.socialAccount.delete({ where: { id: account.id } });
    return interaction.reply({ embeds: [embeds.success(`Removed **${account.accountName}** (${account.platform}).`)] });
  },
};
