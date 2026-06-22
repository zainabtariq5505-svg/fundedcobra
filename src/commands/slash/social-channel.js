const { SlashCommandBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { checkAdminInteraction } = require('../../utils/adminCheck');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('social-channel')
    .setDescription('Set the channel where social notifications are posted')
    .addChannelOption(o => o.setName('channel').setDescription('Notification channel').setRequired(true)),

  async execute(interaction) {
    if (!await checkAdminInteraction(interaction)) return;
    const channel = interaction.options.getChannel('channel');
    await prisma.socialNotifierSettings.upsert({ where: { guildId: interaction.guild.id }, create: { guildId: interaction.guild.id, notificationChannelId: channel.id }, update: { notificationChannelId: channel.id } });
    return interaction.reply({ embeds: [embeds.success(`Notification channel set to <#${channel.id}>.`)], ephemeral: true });
  },
};
