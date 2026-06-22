const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const { isAdmin } = require('../../config/permissions');
const { calcLevel, getXPSettings, handleLevelUp } = require('../../services/xpService');

const ACCENT_COLOR = 0x0099FF;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xp-add')
    .setDescription('Add XP to a user (admin only).')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to add XP to').setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('amount').setDescription('Amount of XP to add').setRequired(true).setMinValue(1)
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

    const oldLevel = existing?.level ?? 0;
    const newTotal = (existing?.totalXp ?? 0) + amount;
    const newLevel = calcLevel(newTotal);

    const record = await prisma.userXP.upsert({
      where: { guildId_userId: { guildId, userId: target.id } },
      update: { totalXp: { increment: amount }, level: newLevel },
      create: {
        guildId,
        userId: target.id,
        username: target.username,
        totalXp: amount,
        level: newLevel,
        messageCount: 0,
      },
    });

    await prisma.xPLog.create({
      data: { guildId, userId: target.id, xpAmount: amount, reason: 'admin-add' },
    });

    if (newLevel > oldLevel) {
      const member = interaction.guild.members.cache.get(target.id)
        || await interaction.guild.members.fetch(target.id).catch(() => null);
      if (member) {
        const xpSettings = await getXPSettings(guildId);
        await handleLevelUp(interaction.guild, member, newLevel, xpSettings, interaction.client);
      }
    }

    const embed = new EmbedBuilder()
      .setColor(ACCENT_COLOR)
      .setDescription(`✅ Added **${amount} XP** to <@${target.id}>. New total: **${record.totalXp.toLocaleString()} XP** (Level ${newLevel})`)
      .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' });

    return interaction.editReply({ embeds: [embed] });
  },
};
