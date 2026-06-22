const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const { isModerator, checkHierarchy, parseDuration, formatDuration, createCase, buildModEmbed, sendModLog, dmUser } = require('../../services/moderationService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout (mute) a user')
    .addUserOption(o => o.setName('user').setDescription('The user to mute').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('Duration (e.g. 10m, 1h, 1d, 7d)').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction, client) {
    if (!await isModerator(interaction.member, interaction.guild.id)) {
      return interaction.reply({ embeds: [embeds.error('You need Moderator or Administrator permission.')], ephemeral: true });
    }
    const target = await interaction.guild.members.fetch(interaction.options.getUser('user').id).catch(() => null);
    if (!target) return interaction.reply({ embeds: [embeds.error('User not found.')], ephemeral: true });

    const check = checkHierarchy(interaction.guild, interaction.member, target);
    if (!check.ok) return interaction.reply({ embeds: [embeds.error(check.reason)], ephemeral: true });

    const durationStr = interaction.options.getString('duration');
    const durationMs  = parseDuration(durationStr);
    if (!durationMs) return interaction.reply({ embeds: [embeds.error('Invalid duration. Use: `10m`, `1h`, `2d`, `7d`')], ephemeral: true });
    if (durationMs > 28 * 24 * 60 * 60 * 1000) return interaction.reply({ embeds: [embeds.error('Maximum timeout is **28 days**.')], ephemeral: true });

    const reason    = interaction.options.getString('reason') || 'No reason provided';
    const expiresAt = new Date(Date.now() + durationMs);
    const duration  = formatDuration(durationMs);

    await target.timeout(durationMs, reason);
    const mc = await createCase({ guildId: interaction.guild.id, actionType: 'timeout', target: target.user, moderator: interaction.user, reason, duration, expiresAt });
    await sendModLog(client, interaction.guild.id, buildModEmbed({ caseId: mc.caseId, actionType: 'timeout', target: target.user, moderator: interaction.user, reason, duration, expiresAt }));
    await dmUser(target.user, embeds.error(`You have been timed out in **${interaction.guild.name}** for **${duration}**.\n\n**Reason:** ${reason}`, 'Timed Out'));

    return interaction.reply({ embeds: [embeds.success(`🔇 **${target.user.username}** timed out for **${duration}**.\n**Reason:** ${reason}`)] });
  },
};
