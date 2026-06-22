const { SlashCommandBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { isModerator } = require('../../services/moderationService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Blacklist a user (blocks tickets, giveaways, sensitive commands)')
    .addUserOption(o => o.setName('user').setDescription('The user to blacklist').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true)),

  async execute(interaction) {
    if (!await isModerator(interaction.member, interaction.guild.id)) {
      return interaction.reply({ embeds: [embeds.error('You need Moderator or Administrator permission.')], ephemeral: true });
    }
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    await prisma.blacklist.upsert({
      where:  { guildId_userId: { guildId: interaction.guild.id, userId: user.id } },
      create: { guildId: interaction.guild.id, userId: user.id, username: user.tag, reason, addedBy: interaction.user.id, active: true },
      update: { reason, addedBy: interaction.user.id, active: true },
    });
    return interaction.reply({ embeds: [embeds.success(`🚫 **${user.username}** has been blacklisted.\n**Reason:** ${reason}`)] });
  },
};
