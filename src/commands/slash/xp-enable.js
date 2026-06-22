const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const { isAdmin } = require('../../config/permissions');

const ACCENT_COLOR = 0x0099FF;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xp-enable')
    .setDescription('Enable the XP system for this server (admin only).'),

  async execute(interaction) {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: interaction.guild.id },
    }).catch(() => null);

    if (!isAdmin(interaction.member, settings?.adminRoleId)) {
      return interaction.reply({ content: 'Admin only.', ephemeral: true });
    }

    await interaction.deferReply();

    const guildId = interaction.guild.id;

    await prisma.xPSettings.upsert({
      where: { guildId },
      update: { enabled: true },
      create: { guildId, enabled: true },
    });

    const embed = new EmbedBuilder()
      .setColor(ACCENT_COLOR)
      .setDescription('✅ XP system **enabled**.')
      .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' });

    return interaction.editReply({ embeds: [embed] });
  },
};
