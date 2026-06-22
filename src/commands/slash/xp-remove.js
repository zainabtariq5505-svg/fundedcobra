const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const { isAdmin } = require('../../config/permissions');
const { calcLevel } = require('../../services/xpService');

const ACCENT_COLOR = 0x0099FF;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xp-remove')
    .setDescription('Remove XP from a user (admin only).')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to remove XP from').setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('amount').setDescription('Amount of XP to remove').setRequired(true).setMinValue(1)
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
    const amount = interaction.options.getInteger('amount');
    const guildId = interaction.guild.id;

    const existing = await prisma.userXP.findUnique({
      where: { guildId_userId: { guildId, userId: target.id } },
    });

    if (!existing) {
      return interaction.editReply({ content: `<@${target.id}> has no XP record.` });
    }

    const newTotal = Math.max(0, existing.totalXp - amount);
    const newLevel = calcLevel(newTotal);

    const record = await prisma.userXP.update({
      where: { guildId_userId: { guildId, userId: target.id } },
      data: { totalXp: newTotal, level: newLevel },
    });

    await prisma.xPLog.create({
      data: { guildId, userId: target.id, xpAmount: -amount, reason: 'admin-remove' },
    });

    const embed = new EmbedBuilder()
      .setColor(ACCENT_COLOR)
      .setDescription(`✅ Removed **${amount} XP** from <@${target.id}>. New total: **${record.totalXp.toLocaleString()} XP** (Level ${newLevel})`)
      .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' });

    return interaction.editReply({ embeds: [embed] });
  },
};
