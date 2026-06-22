const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const { isModerator, checkHierarchy, parseDuration, formatDuration, createCase, buildModEmbed, sendModLog, dmUser } = require('../../services/moderationService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user (optionally temporarily)')
    .addUserOption(o => o.setName('user').setDescription('The user to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false))
    .addStringOption(o => o.setName('duration').setDescription('Temporary ban duration (e.g. 1d, 7d) — omit for permanent').setRequired(false)),

  async execute(interaction, client) {
    if (!await isModerator(interaction.member, interaction.guild.id)) {
      return interaction.reply({ embeds: [embeds.error('You need Moderator or Administrator permission.')], ephemeral: true });
    }
    const target = await interaction.guild.members.fetch(interaction.options.getUser('user').id).catch(() => null);
    if (!target) return interaction.reply({ embeds: [embeds.error('User not found in this server.')], ephemeral: true });

    const check = checkHierarchy(interaction.guild, interaction.member, target);
    if (!check.ok) return interaction.reply({ embeds: [embeds.error(check.reason)], ephemeral: true });
    if (!target.bannable) return interaction.reply({ embeds: [embeds.error('I cannot ban this user.')], ephemeral: true });

    const reason      = interaction.options.getString('reason') || 'No reason provided';
    const durationStr = interaction.options.getString('duration');
    const durationMs  = durationStr ? parseDuration(durationStr) : null;
    const duration    = durationMs ? formatDuration(durationMs) : null;
    const expiresAt   = durationMs ? new Date(Date.now() + durationMs) : null;

    await dmUser(target.user, embeds.error(
      `You have been ${duration ? `temporarily banned (${duration})` : 'permanently banned'} from **${interaction.guild.name}**.\n\n**Reason:** ${reason}`,
      'Banned',
    ));
    await target.ban({ reason, deleteMessageSeconds: 24 * 60 * 60 });

    const mc = await createCase({ guildId: interaction.guild.id, actionType: 'ban', target: target.user, moderator: interaction.user, reason, duration, expiresAt });
    await sendModLog(client, interaction.guild.id, buildModEmbed({ caseId: mc.caseId, actionType: 'ban', target: target.user, moderator: interaction.user, reason, duration, expiresAt }));

    return interaction.reply({ embeds: [embeds.success(`🔨 **${target.user.username}** has been ${duration ? `banned for **${duration}**` : '**permanently banned**'}.\n**Reason:** ${reason}`)] });
  },
};
