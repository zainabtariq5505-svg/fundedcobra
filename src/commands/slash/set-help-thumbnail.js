const { SlashCommandBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { checkAdminInteraction } = require('../../utils/adminCheck');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-help-thumbnail')
    .setDescription('Set the help menu thumbnail image')
    .addStringOption(o => o.setName('url').setDescription('Thumbnail image URL (https://...)').setRequired(true)),

  async execute(interaction) {
    if (!await checkAdminInteraction(interaction)) return;
    const url = interaction.options.getString('url');
    if (!url.startsWith('http')) return interaction.reply({ embeds: [embeds.error('Provide a valid image URL.')], ephemeral: true });

    await prisma.helpMenuSettings.upsert({
      where:  { guildId: interaction.guild.id },
      create: { guildId: interaction.guild.id, thumbnailUrl: url },
      update: { thumbnailUrl: url },
    });
    return interaction.reply({ embeds: [embeds.success(`Help menu thumbnail updated.`)], ephemeral: true });
  },
};
