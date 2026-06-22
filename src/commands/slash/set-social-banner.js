const { SlashCommandBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { checkAdminInteraction } = require('../../utils/adminCheck');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-social-banner')
    .setDescription('Set the notification banner image for a platform')
    .addStringOption(o => o.setName('platform').setDescription('Platform').setRequired(true).addChoices(
      { name: 'YouTube', value: 'youtube' }, { name: 'Instagram', value: 'instagram' },
      { name: 'X', value: 'x' }, { name: 'TikTok', value: 'tiktok' },
    ))
    .addStringOption(o => o.setName('url').setDescription('Banner image URL').setRequired(true)),

  async execute(interaction) {
    if (!await checkAdminInteraction(interaction)) return;
    const platform = interaction.options.getString('platform');
    const url      = interaction.options.getString('url');
    const key      = `${platform}BannerUrl`;
    await prisma.socialNotifierSettings.upsert({ where: { guildId: interaction.guild.id }, create: { guildId: interaction.guild.id, [key]: url }, update: { [key]: url } });
    return interaction.reply({ embeds: [embeds.success(`**${platform}** notification banner updated.`)], ephemeral: true });
  },
};
