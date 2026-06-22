const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const { isModerator, createCase, buildModEmbed, sendModLog } = require('../../services/moderationService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock the current channel')
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction, client) {
    if (!await isModerator(interaction.member, interaction.guild.id)) {
      return interaction.reply({ embeds: [embeds.error('You need Moderator or Administrator permission.')], ephemeral: true });
    }
    if (!interaction.channel.permissionsFor(interaction.guild.members.me).has('ManageChannels')) {
      return interaction.reply({ embeds: [embeds.error('I need **Manage Channels** permission.')], ephemeral: true });
    }
    const reason = interaction.options.getString('reason') || 'No reason provided';
    await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null }, { reason });
    const mc = await createCase({ guildId: interaction.guild.id, actionType: 'unlock', target: { id: interaction.channel.id, tag: `#${interaction.channel.name}`, username: `#${interaction.channel.name}` }, moderator: interaction.user, reason });
    await sendModLog(client, interaction.guild.id, buildModEmbed({ caseId: mc.caseId, actionType: 'unlock', target: { id: interaction.channel.id, tag: `#${interaction.channel.name}` }, moderator: interaction.user, reason, extra: [{ name: 'Channel', value: `<#${interaction.channel.id}>`, inline: true }] }));
    return interaction.reply({ embeds: [embeds.success(`🔓 <#${interaction.channel.id}> has been **unlocked**.`)] });
  },
};
