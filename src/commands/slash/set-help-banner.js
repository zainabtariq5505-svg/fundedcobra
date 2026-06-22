const { SlashCommandBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { checkAdminInteraction } = require('../../utils/adminCheck');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-help-banner')
    .setDescription('Set the help menu banner image')
    .addStringOption(o => o.setName('url').setDescription('Banner image URL (https://...)').setRequired(true)),

  async execute(interaction) {
    if (!await checkAdminInteraction(interaction)) return;
    const url = interaction.options.getString('url');
    if (!url.startsWith('http')) return interaction.reply({ embeds: [embeds.error('Provide a valid image URL.')], ephemeral: true });

    await prisma.helpMenuSettings.upsert({
      where:  { guildId: interaction.guild.id },
      create: { guildId: interaction.guild.id, bannerUrl: url },
      update: { bannerUrl: url },
    });
    return interaction.reply({ embeds: [embeds.success(`Help menu banner updated.`)], ephemeral: true });
  },
};
