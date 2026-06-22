const { SlashCommandBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { isModerator } = require('../../services/moderationService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unwatch')
    .setDescription('Remove a user from the watchlist')
    .addUserOption(o => o.setName('user').setDescription('The user to remove').setRequired(true)),

  async execute(interaction) {
    if (!await isModerator(interaction.member, interaction.guild.id)) {
      return interaction.reply({ embeds: [embeds.error('You need Moderator or Administrator permission.')], ephemeral: true });
    }
    const user = interaction.options.getUser('user');
    const entry = await prisma.watchlist.findUnique({ where: { guildId_userId: { guildId: interaction.guild.id, userId: user.id } } });
    if (!entry?.active) return interaction.reply({ embeds: [embeds.error('This user is not on the watchlist.')], ephemeral: true });
    await prisma.watchlist.update({ where: { id: entry.id }, data: { active: false } });
    return interaction.reply({ embeds: [embeds.success(`✅ **${user.username}** removed from watchlist.`)] });
  },
};
