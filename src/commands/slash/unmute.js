const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const { isModerator, checkHierarchy, createCase, buildModEmbed, sendModLog, dmUser } = require('../../services/moderationService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove a timeout from a user')
    .addUserOption(o => o.setName('user').setDescription('The user to unmute').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction, client) {
    if (!await isModerator(interaction.member, interaction.guild.id)) {
      return interaction.reply({ embeds: [embeds.error('You need Moderator or Administrator permission.')], ephemeral: true });
    }
    const target = await interaction.guild.members.fetch(interaction.options.getUser('user').id).catch(() => null);
    if (!target) return interaction.reply({ embeds: [embeds.error('User not found.')], ephemeral: true });

    if (!target.communicationDisabledUntil) return interaction.reply({ embeds: [embeds.error(`**${target.user.username}** is not currently timed out.`)], ephemeral: true });

    const check = checkHierarchy(interaction.guild, interaction.member, target);
    if (!check.ok) return interaction.reply({ embeds: [embeds.error(check.reason)], ephemeral: true });

    const reason = interaction.options.getString('reason') || 'No reason provided';
    await target.timeout(null, reason);
    const mc = await createCase({ guildId: interaction.guild.id, actionType: 'unmute', target: target.user, moderator: interaction.user, reason });
    await sendModLog(client, interaction.guild.id, buildModEmbed({ caseId: mc.caseId, actionType: 'unmute', target: target.user, moderator: interaction.user, reason }));
    await dmUser(target.user, embeds.success(`Your timeout in **${interaction.guild.name}** has been removed.\n\n**Reason:** ${reason}`, 'Unmuted'));

    return interaction.reply({ embeds: [embeds.success(`🔊 **${target.user.username}**'s timeout has been removed.`)] });
  },
};
