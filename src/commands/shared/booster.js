const { SlashCommandBuilder } = require('discord.js');
const { checkAdminInteraction } = require('../../utils/adminCheck');
const auditLog = require('../../services/auditLogService');
const {
  getBoosterSettings,
  updateBoosterSettings,
  buildBoosterStatEmbed,
  buildBoosterListEmbed,
  buildBoosterLogsEmbed,
  buildBoosterSummaryEmbed,
  previewBoostPayload,
} = require('../../services/boosterService');
const embeds = require('../../utils/embeds');
const prisma = require('../../database/prisma');

function buildBoosterSlashCommand({ name, description, mode, configure = (b) => b }) {
  return {
    data: configure(new SlashCommandBuilder().setName(name).setDescription(description)),
    adminOnly: true,
    async execute(interaction) {
      if (!await checkAdminInteraction(interaction)) return;
      return handleBoosterInteraction(interaction, mode);
    },
  };
}

// ── Shared sub-handlers ────────────────────────────────────────────────────

async function handleBoosterStats(target, guild, isInteraction) {
  const settings = await getBoosterSettings(guild.id);
  const latestLog = await prisma.boosterLog.findFirst({
    where: { guildId: guild.id },
    orderBy: { createdAt: 'desc' },
  }).catch(() => null);

  const embed = buildBoosterStatEmbed(guild, settings, latestLog);
  return isInteraction
    ? target.reply({ embeds: [embed], ephemeral: false })
    : target.reply({ embeds: [embed] });
}

async function handleBoosterList(target, guild, isInteraction) {
  const boosters = guild.members.cache.filter(m => m.premiumSince).map(m => m);
  const embed = buildBoosterListEmbed(guild, boosters);
  return isInteraction
    ? target.reply({ embeds: [embed] })
    : target.reply({ embeds: [embed] });
}

async function handleBoosterLogs(target, guild, isInteraction) {
  const logs = await prisma.boosterLog.findMany({
    where: { guildId: guild.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  }).catch(() => []);

  const embed = buildBoosterLogsEmbed(guild, logs);
  return isInteraction
    ? target.reply({ embeds: [embed], ephemeral: true })
    : target.reply({ embeds: [embed] });
}

async function handleBoosterPreview(target, isInteraction) {
  const member = target.member || target;
  const payload = await previewBoostPayload(member);
  return isInteraction
    ? target.reply({ ...payload, ephemeral: true })
    : target.reply(payload);
}

async function handleBoosterSummary(target, guild, isInteraction) {
  const settings = await getBoosterSettings(guild.id);
  const embed = buildBoosterSummaryEmbed(guild, settings);
  return isInteraction
    ? target.reply({ embeds: [embed], ephemeral: true })
    : target.reply({ embeds: [embed] });
}

// ── Prefix handler ──────────────────────────────────────────────────────────

async function handleBoosterPrefix(message, args, cmdName) {
  const guildId = message.guild.id;
  const value = args.join(' ').trim();

  if (cmdName === 'booster-enable' || cmdName === 'booster-disable') {
    const updated = await updateBoosterSettings(guildId, { enabled: cmdName === 'booster-enable' });
    await auditLog.log({ guildId, adminId: message.author.id, action: cmdName.toUpperCase() });
    return message.reply({ embeds: [embeds.success(`Booster system ${updated.enabled ? 'enabled ✅' : 'disabled ❌'}.`)] });
  }

  if (cmdName === 'set-booster-channel') {
    const channelId = message.mentions.channels.first()?.id || args[0];
    if (!channelId) return message.reply({ embeds: [embeds.error('Mention a channel or provide its ID.')] });
    const clean = String(channelId).replace(/[<#>]/g, '');
    await updateBoosterSettings(guildId, { boosterChannelId: clean });
    await auditLog.log({ guildId, adminId: message.author.id, action: 'SET_BOOSTER_CHANNEL', target: clean });
    return message.reply({ embeds: [embeds.success(`Booster channel set to <#${clean}>.`)] });
  }

  if (cmdName === 'set-booster-message') {
    if (!value) return message.reply({ embeds: [embeds.error('Provide a booster message. Variables: {user} {username} {server} {memberCount} {boostCount} {boostTier} {date} {time} {brand}')] });
    await updateBoosterSettings(guildId, { boosterMessage: value });
    await auditLog.log({ guildId, adminId: message.author.id, action: 'SET_BOOSTER_MESSAGE', details: value.slice(0, 200) });
    return message.reply({ embeds: [embeds.success('Booster message updated.')] });
  }

  if (cmdName === 'set-booster-banner') {
    if (!value) return message.reply({ embeds: [embeds.error('Provide an image URL.')] });
    await updateBoosterSettings(guildId, { bannerUrl: value });
    await auditLog.log({ guildId, adminId: message.author.id, action: 'SET_BOOSTER_BANNER', details: value.slice(0, 200) });
    return message.reply({ embeds: [embeds.success('Booster banner updated.')] });
  }

  if (cmdName === 'set-booster-thumbnail') {
    if (!value) return message.reply({ embeds: [embeds.error('Provide an image URL.')] });
    await updateBoosterSettings(guildId, { thumbnailUrl: value });
    await auditLog.log({ guildId, adminId: message.author.id, action: 'SET_BOOSTER_THUMBNAIL', details: value.slice(0, 200) });
    return message.reply({ embeds: [embeds.success('Booster thumbnail updated.')] });
  }

  if (cmdName === 'set-booster-role') {
    const roleId = message.mentions.roles.first()?.id || args[0];
    if (!roleId) return message.reply({ embeds: [embeds.error('Mention a role or provide its ID.')] });
    const clean = String(roleId).replace(/[<@&>]/g, '');
    const role = message.guild.roles.cache.get(clean);
    const roleName = role?.name || null;
    await updateBoosterSettings(guildId, { boosterRoleId: clean });
    await auditLog.log({ guildId, adminId: message.author.id, action: 'SET_BOOSTER_ROLE', target: clean });
    return message.reply({ embeds: [embeds.success(`Booster role set to <@&${clean}>.`)] });
  }

  if (cmdName === 'remove-booster-role') {
    await updateBoosterSettings(guildId, { boosterRoleId: null });
    await auditLog.log({ guildId, adminId: message.author.id, action: 'REMOVE_BOOSTER_ROLE' });
    return message.reply({ embeds: [embeds.success('Booster role removed.')] });
  }

  if (cmdName === 'booster-preview') {
    return handleBoosterPreview(message, false);
  }

  if (cmdName === 'booster-stats') {
    return handleBoosterStats(message, message.guild, false);
  }

  if (cmdName === 'booster-list') {
    return handleBoosterList(message, message.guild, false);
  }

  if (cmdName === 'booster-logs') {
    return handleBoosterLogs(message, message.guild, false);
  }

  if (cmdName === 'set-booster-reactions') {
    if (!value) return message.reply({ embeds: [embeds.error('Provide emojis separated by spaces. Example: `!set-booster-reactions 🎉 👑 🐍 🔥`')] });
    const reactions = value.split(/\s+/).filter(Boolean);
    await updateBoosterSettings(guildId, { reactionsJson: JSON.stringify(reactions) });
    await auditLog.log({ guildId, adminId: message.author.id, action: 'SET_BOOSTER_REACTIONS', details: reactions.join(' ') });
    return message.reply({ embeds: [embeds.success(`Booster reactions set: ${reactions.join(' ')}`)] });
  }

  if (cmdName === 'booster-dm-enable' || cmdName === 'booster-dm-disable') {
    const updated = await updateBoosterSettings(guildId, { boosterDmEnabled: cmdName === 'booster-dm-enable' });
    await auditLog.log({ guildId, adminId: message.author.id, action: cmdName.toUpperCase() });
    return message.reply({ embeds: [embeds.success(`Booster DMs ${updated.boosterDmEnabled ? 'enabled ✅' : 'disabled ❌'}.`)] });
  }

  if (cmdName === 'set-booster-dm') {
    if (!value) return message.reply({ embeds: [embeds.error('Provide a DM message.')] });
    await updateBoosterSettings(guildId, { boosterDmMessage: value });
    await auditLog.log({ guildId, adminId: message.author.id, action: 'SET_BOOSTER_DM', details: value.slice(0, 200) });
    return message.reply({ embeds: [embeds.success('Booster DM message updated.')] });
  }

  // Default: show settings summary
  return handleBoosterSummary(message, message.guild, false);
}

// ── Slash handler ───────────────────────────────────────────────────────────

async function handleBoosterInteraction(interaction, mode) {
  const guildId = interaction.guild.id;
  const options = interaction.options;

  if (mode === 'booster-enable' || mode === 'booster-disable') {
    const updated = await updateBoosterSettings(guildId, { enabled: mode === 'booster-enable' });
    await auditLog.log({ guildId, adminId: interaction.user.id, action: mode.toUpperCase() });
    return interaction.reply({ embeds: [embeds.success(`Booster system ${updated.enabled ? 'enabled ✅' : 'disabled ❌'}.`)], ephemeral: true });
  }

  if (mode === 'set-booster-channel') {
    const channel = options.getChannel('channel');
    await updateBoosterSettings(guildId, { boosterChannelId: channel?.id || null });
    await auditLog.log({ guildId, adminId: interaction.user.id, action: 'SET_BOOSTER_CHANNEL', target: channel?.id });
    return interaction.reply({ embeds: [embeds.success(`Booster channel set to ${channel ? `<#${channel.id}>` : 'None'}.`)], ephemeral: true });
  }

  if (mode === 'set-booster-message') {
    const msg = options.getString('message');
    await updateBoosterSettings(guildId, { boosterMessage: msg });
    await auditLog.log({ guildId, adminId: interaction.user.id, action: 'SET_BOOSTER_MESSAGE', details: msg.slice(0, 200) });
    return interaction.reply({ embeds: [embeds.success('Booster message updated.')], ephemeral: true });
  }

  if (mode === 'set-booster-banner') {
    const url = options.getString('url');
    await updateBoosterSettings(guildId, { bannerUrl: url });
    await auditLog.log({ guildId, adminId: interaction.user.id, action: 'SET_BOOSTER_BANNER', details: url.slice(0, 200) });
    return interaction.reply({ embeds: [embeds.success('Booster banner updated.')], ephemeral: true });
  }

  if (mode === 'set-booster-thumbnail') {
    const url = options.getString('url');
    await updateBoosterSettings(guildId, { thumbnailUrl: url });
    await auditLog.log({ guildId, adminId: interaction.user.id, action: 'SET_BOOSTER_THUMBNAIL', details: url.slice(0, 200) });
    return interaction.reply({ embeds: [embeds.success('Booster thumbnail updated.')], ephemeral: true });
  }

  if (mode === 'set-booster-role') {
    const role = options.getRole('role');
    await updateBoosterSettings(guildId, { boosterRoleId: role?.id || null });
    await auditLog.log({ guildId, adminId: interaction.user.id, action: 'SET_BOOSTER_ROLE', target: role?.id });
    return interaction.reply({ embeds: [embeds.success(`Booster role set to ${role ? `<@&${role.id}>` : 'None'}.`)], ephemeral: true });
  }

  if (mode === 'remove-booster-role') {
    await updateBoosterSettings(guildId, { boosterRoleId: null });
    await auditLog.log({ guildId, adminId: interaction.user.id, action: 'REMOVE_BOOSTER_ROLE' });
    return interaction.reply({ embeds: [embeds.success('Booster role removed.')], ephemeral: true });
  }

  if (mode === 'booster-preview') {
    return handleBoosterPreview(interaction, true);
  }

  if (mode === 'booster-stats') {
    return handleBoosterStats(interaction, interaction.guild, true);
  }

  if (mode === 'booster-list') {
    return handleBoosterList(interaction, interaction.guild, true);
  }

  if (mode === 'booster-logs') {
    return handleBoosterLogs(interaction, interaction.guild, true);
  }

  return interaction.reply({ embeds: [embeds.error('Unknown booster command.')], ephemeral: true });
}

module.exports = {
  buildBoosterSlashCommand,
  handleBoosterPrefix,
  handleBoosterInteraction,
};
