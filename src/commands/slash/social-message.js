const { SlashCommandBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { checkAdminInteraction } = require('../../utils/adminCheck');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('social-message')
    .setDescription('Customize notification message template for a platform')
    .addStringOption(o => o.setName('platform').setDescription('Platform').setRequired(true).addChoices(
      { name: 'YouTube', value: 'youtube' }, { name: 'Instagram', value: 'instagram' },
      { name: 'X', value: 'x' }, { name: 'TikTok', value: 'tiktok' },
    ))
    .addStringOption(o => o.setName('template').setDescription('Message template. Variables: {ping} {platform} {accountName} {title} {url} {publishedAt}').setRequired(true)),

  async execute(interaction) {
    if (!await checkAdminInteraction(interaction)) return;
    const platform = interaction.options.getString('platform');
    const template = interaction.options.getString('template');
    const key = `${platform}Template`;
    await prisma.socialNotifierSettings.upsert({ where: { guildId: interaction.guild.id }, create: { guildId: interaction.guild.id, [key]: template }, update: { [key]: template } });
    return interaction.reply({ embeds: [embeds.success(`Template for **${platform}** updated:\n> ${template}`)], ephemeral: true });
  },
};
