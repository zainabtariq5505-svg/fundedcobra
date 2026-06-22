const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const { isModerator, createCase, buildModEmbed, sendModLog } = require('../../services/moderationService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete multiple messages from this channel')
    .addIntegerOption(o => o.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)),

  async execute(interaction, client) {
    if (!await isModerator(interaction.member, interaction.guild.id)) {
      return interaction.reply({ embeds: [embeds.error('You need Moderator or Administrator permission.')], ephemeral: true });
    }
    if (!interaction.channel.permissionsFor(interaction.guild.members.me).has('ManageMessages')) {
      return interaction.reply({ embeds: [embeds.error('I need **Manage Messages** permission.')], ephemeral: true });
    }

    const amount = interaction.options.getInteger('amount');
    await interaction.deferReply({ ephemeral: true });

    const deleted = await interaction.channel.bulkDelete(amount, true).catch(err => {
      interaction.editReply({ embeds: [embeds.error(`Purge failed: ${err.message}`)] });
      return null;
    });
    if (!deleted) return;

    const mc = await createCase({ guildId: interaction.guild.id, actionType: 'purge', target: { id: interaction.channel.id, tag: `#${interaction.channel.name}`, username: `#${interaction.channel.name}` }, moderator: interaction.user, reason: `Purged ${deleted.size} messages in #${interaction.channel.name}` });
    await sendModLog(client, interaction.guild.id, buildModEmbed({ caseId: mc.caseId, actionType: 'purge', target: { id: interaction.channel.id, tag: `#${interaction.channel.name}` }, moderator: interaction.user, reason: mc.reason, extra: [{ name: 'Channel', value: `<#${interaction.channel.id}>`, inline: true }] }));

    return interaction.editReply({ embeds: [embeds.success(`🗑️ Deleted **${deleted.size}** message(s).`)] });
  },
};
