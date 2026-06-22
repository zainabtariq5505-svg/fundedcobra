const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const { isModerator, createCase, buildModEmbed, sendModLog } = require('../../services/moderationService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set channel slowmode (0 to disable)')
    .addIntegerOption(o => o.setName('seconds').setDescription('Slowmode in seconds (0-21600)').setRequired(true).setMinValue(0).setMaxValue(21600)),

  async execute(interaction, client) {
    if (!await isModerator(interaction.member, interaction.guild.id)) {
      return interaction.reply({ embeds: [embeds.error('You need Moderator or Administrator permission.')], ephemeral: true });
    }
    if (!interaction.channel.permissionsFor(interaction.guild.members.me).has('ManageChannels')) {
      return interaction.reply({ embeds: [embeds.error('I need **Manage Channels** permission.')], ephemeral: true });
    }
    const secs = interaction.options.getInteger('seconds');
    await interaction.channel.setRateLimitPerUser(secs, `Slowmode set by ${interaction.user.tag}`);
    const mc = await createCase({ guildId: interaction.guild.id, actionType: 'slowmode', target: { id: interaction.channel.id, tag: `#${interaction.channel.name}`, username: `#${interaction.channel.name}` }, moderator: interaction.user, reason: secs === 0 ? 'Slowmode disabled' : `Slowmode set to ${secs}s` });
    await sendModLog(client, interaction.guild.id, buildModEmbed({ caseId: mc.caseId, actionType: 'slowmode', target: { id: interaction.channel.id, tag: `#${interaction.channel.name}` }, moderator: interaction.user, reason: mc.reason, extra: [{ name: 'Channel', value: `<#${interaction.channel.id}>`, inline: true }, { name: 'Slowmode', value: secs === 0 ? 'Disabled' : `${secs} seconds`, inline: true }] }));
    return interaction.reply({ embeds: [embeds.success(secs === 0 ? `🐌 Slowmode disabled.` : `🐌 Slowmode set to **${secs}s**.`)] });
  },
};
