const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const { isModerator, checkHierarchy, createCase, buildModEmbed, sendModLog, dmUser } = require('../../services/moderationService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption(o => o.setName('user').setDescription('The user to kick').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction, client) {
    if (!await isModerator(interaction.member, interaction.guild.id)) {
      return interaction.reply({ embeds: [embeds.error('You need Moderator or Administrator permission.')], ephemeral: true });
    }
    const target = await interaction.guild.members.fetch(interaction.options.getUser('user').id).catch(() => null);
    if (!target) return interaction.reply({ embeds: [embeds.error('User not found.')], ephemeral: true });

    const check = checkHierarchy(interaction.guild, interaction.member, target);
    if (!check.ok) return interaction.reply({ embeds: [embeds.error(check.reason)], ephemeral: true });
    if (!target.kickable) return interaction.reply({ embeds: [embeds.error('I do not have permission to kick this user.')], ephemeral: true });

    const reason = interaction.options.getString('reason') || 'No reason provided';
    await dmUser(target.user, embeds.error(`You have been kicked from **${interaction.guild.name}**.\n\n**Reason:** ${reason}`, 'Kicked'));
    await target.kick(reason);

    const mc = await createCase({ guildId: interaction.guild.id, actionType: 'kick', target: target.user, moderator: interaction.user, reason });
    await sendModLog(client, interaction.guild.id, buildModEmbed({ caseId: mc.caseId, actionType: 'kick', target: target.user, moderator: interaction.user, reason }));
    return interaction.reply({ embeds: [embeds.success(`👢 **${target.user.username}** has been kicked.\n**Reason:** ${reason}`)] });
  },
};
