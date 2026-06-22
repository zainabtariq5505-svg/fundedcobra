const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const { isModerator, createCase, buildModEmbed, sendModLog } = require('../../services/moderationService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by their ID')
    .addStringOption(o => o.setName('userid').setDescription('The user ID to unban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction, client) {
    if (!await isModerator(interaction.member, interaction.guild.id)) {
      return interaction.reply({ embeds: [embeds.error('You need Moderator or Administrator permission.')], ephemeral: true });
    }
    const userId = interaction.options.getString('userid');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
    if (!ban) return interaction.reply({ embeds: [embeds.error('This user is not currently banned.')], ephemeral: true });

    await interaction.guild.members.unban(userId, reason);
    const mc = await createCase({ guildId: interaction.guild.id, actionType: 'unban', target: { id: userId, tag: ban.user?.tag ?? userId, username: ban.user?.username ?? userId }, moderator: interaction.user, reason });
    await sendModLog(client, interaction.guild.id, buildModEmbed({ caseId: mc.caseId, actionType: 'unban', target: { id: userId, tag: ban.user?.tag ?? userId }, moderator: interaction.user, reason }));

    return interaction.reply({ embeds: [embeds.success(`✅ **${ban.user?.username ?? userId}** has been unbanned.\n**Reason:** ${reason}`)] });
  },
};
