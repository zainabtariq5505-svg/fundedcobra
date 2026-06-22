const { SlashCommandBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { checkAdminInteraction } = require('../../utils/adminCheck');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-modlog')
    .setDescription('Set the moderation log channel')
    .addChannelOption(o => o.setName('channel').setDescription('The channel for mod logs').setRequired(true)),

  async execute(interaction) {
    if (!await checkAdminInteraction(interaction)) return;
    const channel = interaction.options.getChannel('channel');
    await prisma.modSettings.upsert({
      where:  { guildId: interaction.guild.id },
      create: { guildId: interaction.guild.id, modLogChannelId: channel.id },
      update: { modLogChannelId: channel.id },
    });
    return interaction.reply({ embeds: [embeds.success(`Moderation log channel set to <#${channel.id}>.`)], ephemeral: true });
  },
};
