const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkAdminInteraction } = require('../../utils/adminCheck');
const auditLog = require('../../services/auditLogService');
const {
  getAutoRoleSettings,
  updateAutoRoleSettings,
  buildAutoRoleStatusEmbed,
  buildAutoRoleLogsEmbed,
} = require('../../services/autoRoleService');
const embeds = require('../../utils/embeds');
const { COLORS, FOOTER } = require('../../utils/embeds');
const prisma = require('../../database/prisma');

function buildAutoRoleSlashCommand({ name, description, mode, configure = (b) => b }) {
  return {
    data: configure(new SlashCommandBuilder().setName(name).setDescription(description)),
    adminOnly: true,
    async execute(interaction) {
      if (!await checkAdminInteraction(interaction)) return;
      return handleAutoRoleInteraction(interaction, mode);
    },
  };
}

// ── Shared sub-handlers ────────────────────────────────────────────────────

async function handleAutoRoleStatus(target, guild, isInteraction) {
  const settings = await getAutoRoleSettings(guild.id);
  const totalAssigned = await prisma.autoRoleLog.count({
    where: { guildId: guild.id, status: 'success' },
  }).catch(() => 0);

  const embed = buildAutoRoleStatusEmbed(guild, settings, totalAssigned, null);
  return isInteraction
    ? target.reply({ embeds: [embed], ephemeral: true })
    : target.reply({ embeds: [embed] });
}

async function handleAutoRoleLogs(target, guild, isInteraction) {
  const logs = await prisma.autoRoleLog.findMany({
    where: { guildId: guild.id },
    orderBy: { assignedAt: 'desc' },
    take: 20,
  }).catch(() => []);

  const embed = buildAutoRoleLogsEmbed(guild, logs);
  return isInteraction
    ? target.reply({ embeds: [embed], ephemeral: true })
    : target.reply({ embeds: [embed] });
}

async function handleAutoRolePreview(target, guild, isInteraction) {
  const settings = await getAutoRoleSettings(guild.id);
  const embed = new EmbedBuilder()
    .setColor(COLORS.GOLD)
    .setTitle('🎭 Auto Role Preview')
    .setDescription(
      settings.roleId
        ? `New members will automatically receive: <@&${settings.roleId}>${settings.delaySeconds > 0 ? ` after **${settings.delaySeconds}s**` : ''}`
        : '⚠️ No auto role configured. Use `!set-autorole @role` to set one.'
    )
    .addFields(
      { name: 'Enabled', value: settings.enabled ? '✅ Yes' : '❌ No', inline: true },
      { name: 'Ignore Bots', value: settings.ignoreBots ? '✅ Yes' : '❌ No', inline: true },
    )
    .setFooter(FOOTER)
    .setTimestamp();

  return isInteraction
    ? target.reply({ embeds: [embed], ephemeral: true })
    : target.reply({ embeds: [embed] });
}

// ── Prefix handler ──────────────────────────────────────────────────────────

async function handleAutoRolePrefix(message, args, cmdName) {
  const guildId = message.guild.id;
  const value = args.join(' ').trim();

  if (cmdName === 'autorole-enable' || cmdName === 'autorole-disable') {
    const updated = await updateAutoRoleSettings(guildId, { enabled: cmdName === 'autorole-enable' });
    await auditLog.log({ guildId, adminId: message.author.id, action: cmdName.toUpperCase() });
    return message.reply({ embeds: [embeds.success(`Auto role system ${updated.enabled ? 'enabled ✅' : 'disabled ❌'}.`)] });
  }

  if (cmdName === 'set-autorole') {
    const roleId = message.mentions.roles.first()?.id || args[0];
    if (!roleId) return message.reply({ embeds: [embeds.error('Mention a role or provide its ID.')] });
    const clean = String(roleId).replace(/[<@&>]/g, '');
    const role = message.guild.roles.cache.get(clean);
    if (!role) return message.reply({ embeds: [embeds.error('Role not found in this server.')] });
    if (role.id === message.guild.id) return message.reply({ embeds: [embeds.error('Cannot set @everyone as auto role.')] });
    await updateAutoRoleSettings(guildId, { roleId: clean, roleName: role.name });
    await auditLog.log({ guildId, adminId: message.author.id, action: 'SET_AUTOROLE', target: clean });
    return message.reply({ embeds: [embeds.success(`Auto role set to <@&${clean}>.`)] });
  }

  if (cmdName === 'remove-autorole') {
    await updateAutoRoleSettings(guildId, { roleId: null, roleName: null });
    await auditLog.log({ guildId, adminId: message.author.id, action: 'REMOVE_AUTOROLE' });
    return message.reply({ embeds: [embeds.success('Auto role removed.')] });
  }

  if (cmdName === 'autorole-status') {
    return handleAutoRoleStatus(message, message.guild, false);
  }

  if (cmdName === 'autorole-preview') {
    return handleAutoRolePreview(message, message.guild, false);
  }

  if (cmdName === 'autorole-logs') {
    return handleAutoRoleLogs(message, message.guild, false);
  }

  if (cmdName === 'set-autorole-delay') {
    const seconds = parseInt(args[0], 10);
    if (isNaN(seconds) || seconds < 0) return message.reply({ embeds: [embeds.error('Provide a valid delay in seconds (0 or more).')] });
    await updateAutoRoleSettings(guildId, { delaySeconds: seconds });
    await auditLog.log({ guildId, adminId: message.author.id, action: 'SET_AUTOROLE_DELAY', details: String(seconds) });
    return message.reply({ embeds: [embeds.success(`Auto role delay set to **${seconds}** second${seconds === 1 ? '' : 's'}.`)] });
  }

  if (cmdName === 'set-autorole-log') {
    const channelId = message.mentions.channels.first()?.id || args[0];
    if (!channelId) return message.reply({ embeds: [embeds.error('Mention a channel or provide its ID.')] });
    const clean = String(channelId).replace(/[<#>]/g, '');
    await updateAutoRoleSettings(guildId, { logChannelId: clean });
    await auditLog.log({ guildId, adminId: message.author.id, action: 'SET_AUTOROLE_LOG', target: clean });
    return message.reply({ embeds: [embeds.success(`Auto role log channel set to <#${clean}>.`)] });
  }

  if (cmdName === 'autorole-ignore-bots-enable' || cmdName === 'autorole-ignore-bots-disable') {
    const updated = await updateAutoRoleSettings(guildId, { ignoreBots: cmdName === 'autorole-ignore-bots-enable' });
    await auditLog.log({ guildId, adminId: message.author.id, action: cmdName.toUpperCase() });
    return message.reply({ embeds: [embeds.success(`Bots will ${updated.ignoreBots ? 'be ignored ✅' : 'receive the auto role ❌'}.`)] });
  }

  // Default: show status
  return handleAutoRoleStatus(message, message.guild, false);
}

// ── Slash handler ───────────────────────────────────────────────────────────

async function handleAutoRoleInteraction(interaction, mode) {
  const guildId = interaction.guild.id;
  const options = interaction.options;

  if (mode === 'autorole-enable' || mode === 'autorole-disable') {
    const updated = await updateAutoRoleSettings(guildId, { enabled: mode === 'autorole-enable' });
    await auditLog.log({ guildId, adminId: interaction.user.id, action: mode.toUpperCase() });
    return interaction.reply({ embeds: [embeds.success(`Auto role system ${updated.enabled ? 'enabled ✅' : 'disabled ❌'}.`)], ephemeral: true });
  }

  if (mode === 'set-autorole') {
    const role = options.getRole('role');
    if (!role) return interaction.reply({ embeds: [embeds.error('Role not found.')], ephemeral: true });
    if (role.id === interaction.guild.id) return interaction.reply({ embeds: [embeds.error('Cannot set @everyone as auto role.')], ephemeral: true });
    await updateAutoRoleSettings(guildId, { roleId: role.id, roleName: role.name });
    await auditLog.log({ guildId, adminId: interaction.user.id, action: 'SET_AUTOROLE', target: role.id });
    return interaction.reply({ embeds: [embeds.success(`Auto role set to <@&${role.id}>.`)], ephemeral: true });
  }

  if (mode === 'remove-autorole') {
    await updateAutoRoleSettings(guildId, { roleId: null, roleName: null });
    await auditLog.log({ guildId, adminId: interaction.user.id, action: 'REMOVE_AUTOROLE' });
    return interaction.reply({ embeds: [embeds.success('Auto role removed.')], ephemeral: true });
  }

  if (mode === 'autorole-status') {
    return handleAutoRoleStatus(interaction, interaction.guild, true);
  }

  if (mode === 'autorole-preview') {
    return handleAutoRolePreview(interaction, interaction.guild, true);
  }

  if (mode === 'autorole-logs') {
    return handleAutoRoleLogs(interaction, interaction.guild, true);
  }

  if (mode === 'set-autorole-delay') {
    const seconds = options.getInteger('seconds');
    await updateAutoRoleSettings(guildId, { delaySeconds: seconds });
    await auditLog.log({ guildId, adminId: interaction.user.id, action: 'SET_AUTOROLE_DELAY', details: String(seconds) });
    return interaction.reply({ embeds: [embeds.success(`Auto role delay set to **${seconds}** second${seconds === 1 ? '' : 's'}.`)], ephemeral: true });
  }

  if (mode === 'set-autorole-log') {
    const channel = options.getChannel('channel');
    await updateAutoRoleSettings(guildId, { logChannelId: channel?.id || null });
    await auditLog.log({ guildId, adminId: interaction.user.id, action: 'SET_AUTOROLE_LOG', target: channel?.id });
    return interaction.reply({ embeds: [embeds.success(`Auto role log channel set to ${channel ? `<#${channel.id}>` : 'None'}.`)], ephemeral: true });
  }

  if (mode === 'autorole-ignore-bots-enable' || mode === 'autorole-ignore-bots-disable') {
    const updated = await updateAutoRoleSettings(guildId, { ignoreBots: mode === 'autorole-ignore-bots-enable' });
    await auditLog.log({ guildId, adminId: interaction.user.id, action: mode.toUpperCase() });
    return interaction.reply({ embeds: [embeds.success(`Bots will ${updated.ignoreBots ? 'be ignored ✅' : 'receive the auto role ❌'}.`)], ephemeral: true });
  }

  return interaction.reply({ embeds: [embeds.error('Unknown autorole command.')], ephemeral: true });
}

module.exports = {
  buildAutoRoleSlashCommand,
  handleAutoRolePrefix,
  handleAutoRoleInteraction,
};
