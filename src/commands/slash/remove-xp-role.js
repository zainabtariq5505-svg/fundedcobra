const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const { isAdmin } = require('../../config/permissions');

const ACCENT_COLOR = 0x0099FF;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove-xp-role')
    .setDescription('Remove a level role assignment (admin only).')
    .addIntegerOption(option =>
      option
        .setName('level')
        .setDescription('The level whose role assignment to remove')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: interaction.guild.id },
    }).catch(() => null);

    if (!isAdmin(interaction.member, settings?.adminRoleId)) {
      return interaction.reply({ content: 'Admin only.', ephemeral: true });
    }

    await interaction.deferReply();

    const level = interaction.options.getInteger('level');
    const guildId = interaction.guild.id;

    const deleted = await prisma.xPLevelRole.deleteMany({
      where: { guildId, level },
    });

    const embed = new EmbedBuilder()
      .setColor(ACCENT_COLOR)
      .setDescription(
        deleted.count
          ? `✅ Removed level role assignment for Level **${level}**.`
          : `No role assignment found for Level **${level}**.`
      )
      .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' });

    return interaction.editReply({ embeds: [embed] });
  },
};
