const { SlashCommandBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { isModerator } = require('../../services/moderationService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deletecase')
    .setDescription('Void a moderation case')
    .addIntegerOption(o => o.setName('id').setDescription('The case number to void').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for voiding').setRequired(false)),

  async execute(interaction) {
    if (!await isModerator(interaction.member, interaction.guild.id)) {
      return interaction.reply({ embeds: [embeds.error('You need Moderator or Administrator permission.')], ephemeral: true });
    }
    const caseId = interaction.options.getInteger('id');
    const reason = interaction.options.getString('reason') || 'Voided by moderator';
    const mc = await prisma.moderationCase.findFirst({ where: { guildId: interaction.guild.id, caseId } });
    if (!mc) return interaction.reply({ embeds: [embeds.error(`Case #${caseId} not found.`)], ephemeral: true });
    if (mc.status === 'deleted') return interaction.reply({ embeds: [embeds.error(`Case #${caseId} is already voided.`)], ephemeral: true });

    await prisma.moderationCase.update({ where: { id: mc.id }, data: { status: 'deleted', deletedReason: reason } });
    return interaction.reply({ embeds: [embeds.success(`🗑️ Case #${caseId} has been voided.\n**Reason:** ${reason}`)] });
  },
};
