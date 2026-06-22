const { SlashCommandBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { isModerator } = require('../../services/moderationService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unblacklist')
    .setDescription('Remove a user from the blacklist')
    .addUserOption(o => o.setName('user').setDescription('The user to unblacklist').setRequired(true)),

  async execute(interaction) {
    if (!await isModerator(interaction.member, interaction.guild.id)) {
      return interaction.reply({ embeds: [embeds.error('You need Moderator or Administrator permission.')], ephemeral: true });
    }
    const user = interaction.options.getUser('user');
    const entry = await prisma.blacklist.findUnique({ where: { guildId_userId: { guildId: interaction.guild.id, userId: user.id } } });
    if (!entry?.active) return interaction.reply({ embeds: [embeds.error('This user is not blacklisted.')], ephemeral: true });
    await prisma.blacklist.update({ where: { id: entry.id }, data: { active: false } });
    return interaction.reply({ embeds: [embeds.success(`✅ **${user.username}** has been removed from the blacklist.`)] });
  },
};
