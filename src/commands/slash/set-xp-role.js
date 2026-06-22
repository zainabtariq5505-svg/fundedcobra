const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const { isAdmin } = require('../../config/permissions');

const ACCENT_COLOR = 0x0099FF;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-xp-role')
    .setDescription('Assign a role when a user reaches a specific level (admin only).')
    .addIntegerOption(option =>
      option
        .setName('level')
        .setDescription('The level at which to assign the role')
        .setRequired(true)
        .setMinValue(1)
    )
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('The role to assign')
        .setRequired(true)
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
    const role = interaction.options.getRole('role');
    const guildId = interaction.guild.id;

    await prisma.xPLevelRole.upsert({
      where: { guildId_level: { guildId, level } },
      update: { roleId: role.id },
      create: { guildId, level, roleId: role.id },
    });

    const embed = new EmbedBuilder()
      .setColor(ACCENT_COLOR)
      .setDescription(`✅ <@&${role.id}> will be awarded at Level **${level}**.`)
      .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' });

    return interaction.editReply({ embeds: [embed] });
  },
};
