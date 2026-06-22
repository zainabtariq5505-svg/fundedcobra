const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const { isAdmin } = require('../../config/permissions');

const ACCENT_COLOR = 0x0099FF;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xp-reset')
    .setDescription('Reset a user\'s XP to 0 (admin only).')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to reset').setRequired(true)
    ),

  async execute(interaction) {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: interaction.guild.id },
    }).catch(() => null);

    if (!isAdmin(interaction.member, settings?.adminRoleId)) {
      return interaction.reply({ content: 'Admin only.', ephemeral: true });
    }

    await interaction.deferReply();

    const target = interaction.options.getUser('user');
    const guildId = interaction.guild.id;

    await prisma.userXP.upsert({
      where: { guildId_userId: { guildId, userId: target.id } },
      update: { totalXp: 0, level: 0, messageCount: 0 },
      create: {
        guildId,
        userId: target.id,
        username: target.username,
        totalXp: 0,
        level: 0,
        messageCount: 0,
      },
    });

    await prisma.xPLog.create({
      data: { guildId, userId: target.id, xpAmount: 0, reason: 'admin-reset' },
    });

    const embed = new EmbedBuilder()
      .setColor(ACCENT_COLOR)
      .setDescription(`✅ Reset XP for <@${target.id}> to 0.`)
      .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' });

    return interaction.editReply({ embeds: [embed] });
  },
};
