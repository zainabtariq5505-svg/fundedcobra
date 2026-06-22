const { SlashCommandBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { isModerator } = require('../../services/moderationService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearwarns')
    .setDescription('Clear all warnings for a user')
    .addUserOption(o => o.setName('user').setDescription('The user to clear warnings for').setRequired(true)),

  async execute(interaction) {
    if (!await isModerator(interaction.member, interaction.guild.id)) {
      return interaction.reply({ embeds: [embeds.error('You need Moderator or Administrator permission.')], ephemeral: true });
    }
    const user = interaction.options.getUser('user');
    const { count } = await prisma.warning.updateMany({ where: { guildId: interaction.guild.id, targetUserId: user.id, active: true }, data: { active: false } });
    return interaction.reply({ embeds: [embeds.success(`Cleared **${count}** warning(s) for **${user.username}**.`)] });
  },
};
