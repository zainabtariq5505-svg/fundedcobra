const { SlashCommandBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { checkAdminInteraction } = require('../../utils/adminCheck');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('social-disable')
    .setDescription('Disable a social account notifier')
    .addStringOption(o => o.setName('id').setDescription('Account ID').setRequired(true)),

  async execute(interaction) {
    if (!await checkAdminInteraction(interaction)) return;
    const id = interaction.options.getString('id');
    const account = await prisma.socialAccount.findFirst({ where: { guildId: interaction.guild.id, OR: [{ id }, { id: { endsWith: id } }] } });
    if (!account) return interaction.reply({ embeds: [embeds.error('Account not found.')], ephemeral: true });
    await prisma.socialAccount.update({ where: { id: account.id }, data: { enabled: false } });
    return interaction.reply({ embeds: [embeds.success(`🔴 **${account.accountName}** (${account.platform}) disabled.`)], ephemeral: true });
  },
};
