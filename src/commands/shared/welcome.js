const { SlashCommandBuilder } = require('discord.js');
const { checkAdminInteraction } = require('../../utils/adminCheck');
const auditLog = require('../../services/auditLogService');
const {
  buildWelcomeSummaryEmbed,
  previewWelcomePayload,
  removeWelcomeButton,
  setWelcomeButton,
  updateWelcomeSettings,
  getWelcomeSettings,
} = require('../../services/welcomeService');
const { getGuildSettings } = require('../../services/settingsService');
const embeds = require('../../utils/embeds');

function buildWelcomeSlashCommand({ name, description, mode, configure = (builder) => builder }) {
  return {
    data: configure(new SlashCommandBuilder().setName(name).setDescription(description)),
    adminOnly: true,
    async execute(interaction) {
      if (!await checkAdminInteraction(interaction)) return;
      return handleWelcomeInteraction(interaction, mode);
    },
  };
}

async function handleWelcomeSummary(target, guild, isInteraction) {
  const [welcomeSettings, guildSettings] = await Promise.all([
    getWelcomeSettings(guild.id),
    getGuildSettings(guild.id),
  ]);

  const embed = buildWelcomeSummaryEmbed(guild, welcomeSettings, guildSettings);
  if (isInteraction) {
    return target.reply({ embeds: [embed], ephemeral: true });
  }
  return target.reply({ embeds: [embed] });
}

async function handleWelcomePreview(target, isInteraction) {
  const member = target.member || target;
  const payload = await previewWelcomePayload(member);
  if (isInteraction) {
    return target.reply({ ...payload, ephemeral: true });
  }
  return target.reply(payload);
}

async function handleWelcomePrefix(message, args, cmdName) {
  const guildId = message.guild.id;
  const value = args.join(' ').trim();

  if (cmdName === 'welcome') {
    return handleWelcomeSummary(message, message.guild, false);
  }

  if (cmdName === 'welcome-enable' || cmdName === 'welcome-disable') {
    const updated = await updateWelcomeSettings(guildId, { enabled: cmdName === 'welcome-enable' });
    await auditLog.log({ guildId, adminId: message.author.id, action: cmdName.toUpperCase() });
    return message.reply({ embeds: [embeds.success(`Welcome system ${updated.enabled ? 'enabled' : 'disabled'}.`)] });
  }

  if (cmdName === 'welcome-preview') {
    return handleWelcomePreview(message, false);
  }

  if (cmdName === 'set-welcome-channel') {
    const channelId = message.mentions.channels.first()?.id || args[0];
    if (!channelId) return message.reply({ embeds: [embeds.error('Mention a welcome channel or provide its ID.')] });
    await updateWelcomeSettings(guildId, { welcomeChannelId: String(channelId).replace(/[<#>]/g, '') });
    await auditLog.log({ guildId, adminId: message.author.id, action: 'SET_WELCOME_CHANNEL', target: String(channelId) });
    return message.reply({ embeds: [embeds.success(`Welcome channel set to <#${String(channelId).replace(/[<#>]/g, '')}>.`)] });
  }

  if (cmdName === 'set-welcome-message') {
    if (!value) return message.reply({ embeds: [embeds.error('Provide a welcome message.')] });
    await updateWelcomeSettings(guildId, { welcomeMessage: value });
    await auditLog.log({ guildId, adminId: message.author.id, action: 'SET_WELCOME_MESSAGE', details: value.slice(0, 200) });
    return message.reply({ embeds: [embeds.success('Welcome message updated.')] });
  }

  if (cmdName === 'set-welcome-banner') {
    if (!value) return message.reply({ embeds: [embeds.error('Provide an image URL.')] });
    await updateWelcomeSettings(guildId, { welcomeBannerUrl: value });
    await auditLog.log({ guildId, adminId: message.author.id, action: 'SET_WELCOME_BANNER', details: value.slice(0, 200) });
    return message.reply({ embeds: [embeds.success('Welcome banner updated.')] });
  }

  if (cmdName === 'set-welcome-thumbnail') {
    if (!value) return message.reply({ embeds: [embeds.error('Provide an image URL.')] });
    await updateWelcomeSettings(guildId, { welcomeThumbnailUrl: value });
    await auditLog.log({ guildId, adminId: message.author.id, action: 'SET_WELCOME_THUMBNAIL', details: value.slice(0, 200) });
    return message.reply({ embeds: [embeds.success('Welcome thumbnail updated.')] });
  }

  if (cmdName === 'set-welcome-role') {
    const roleId = message.mentions.roles.first()?.id || args[0];
    if (!roleId) return message.reply({ embeds: [embeds.error('Mention a role or provide its ID.')] });
    await updateWelcomeSettings(guildId, { welcomeRoleId: String(roleId).replace(/[<@&>]/g, '') });
    await auditLog.log({ guildId, adminId: message.author.id, action: 'SET_WELCOME_ROLE', target: String(roleId) });
    return message.reply({ embeds: [embeds.success(`Welcome role set to <@&${String(roleId).replace(/[<@&>]/g, '')}>.`)] });
  }

  if (cmdName === 'remove-welcome-role') {
    await updateWelcomeSettings(guildId, { welcomeRoleId: null });
    await auditLog.log({ guildId, adminId: message.author.id, action: 'REMOVE_WELCOME_ROLE' });
    return message.reply({ embeds: [embeds.success('Welcome role removed.')] });
  }

  if (cmdName === 'welcome-dm-enable' || cmdName === 'welcome-dm-disable') {
    const updated = await updateWelcomeSettings(guildId, { dmEnabled: cmdName === 'welcome-dm-enable' });
    await auditLog.log({ guildId, adminId: message.author.id, action: cmdName.toUpperCase() });
    return message.reply({ embeds: [embeds.success(`Welcome DMs ${updated.dmEnabled ? 'enabled' : 'disabled'}.`)] });
  }

  if (cmdName === 'set-welcome-dm') {
    if (!value) return message.reply({ embeds: [embeds.error('Provide a welcome DM message.')] });
    await updateWelcomeSettings(guildId, { dmMessage: value });
    await auditLog.log({ guildId, adminId: message.author.id, action: 'SET_WELCOME_DM', details: value.slice(0, 200) });
    return message.reply({ embeds: [embeds.success('Welcome DM message updated.')] });
  }

  if (cmdName === 'set-welcome-button') {
    const slot = args[0];
    const label = args[1];
    const targetValue = args.slice(2).join(' ').trim();
    if (!slot || !label || !targetValue) {
      return message.reply({ embeds: [embeds.error('Usage: `!set-welcome-button <slot> <label> <url_or_channel>`')] });
    }

    try {
      await setWelcomeButton(guildId, slot, label, targetValue);
      await auditLog.log({ guildId, adminId: message.author.id, action: 'SET_WELCOME_BUTTON', target: `slot:${slot}`, details: `${label} -> ${targetValue}`.slice(0, 200) });
      return message.reply({ embeds: [embeds.success(`Welcome button ${slot} saved.`)] });
    } catch (err) {
      return message.reply({ embeds: [embeds.error(err.message)] });
    }
  }

  if (cmdName === 'remove-welcome-button') {
    const slot = args[0];
    if (!slot) return message.reply({ embeds: [embeds.error('Usage: `!remove-welcome-button <slot>`')] });

    try {
      await removeWelcomeButton(guildId, slot);
      await auditLog.log({ guildId, adminId: message.author.id, action: 'REMOVE_WELCOME_BUTTON', target: `slot:${slot}` });
      return message.reply({ embeds: [embeds.success(`Welcome button ${slot} removed.`)] });
    } catch (err) {
      return message.reply({ embeds: [embeds.error(err.message)] });
    }
  }

  return message.reply({ embeds: [embeds.error('Unknown welcome command.')] });
}

async function handleWelcomeInteraction(interaction, mode) {
  const guildId = interaction.guild.id;

  if (mode === 'welcome') {
    return handleWelcomeSummary(interaction, interaction.guild, true);
  }

  if (mode === 'welcome-enable' || mode === 'welcome-disable') {
    const updated = await updateWelcomeSettings(guildId, { enabled: mode === 'welcome-enable' });
    await auditLog.log({ guildId, adminId: interaction.user.id, action: mode.toUpperCase() });
    return interaction.reply({ embeds: [embeds.success(`Welcome system ${updated.enabled ? 'enabled' : 'disabled'}.`)], ephemeral: true });
  }

  if (mode === 'welcome-preview') {
    return handleWelcomePreview(interaction, true);
  }

  const options = interaction.options;

  if (mode === 'set-welcome-channel') {
    const channel = options.getChannel('channel');
    await updateWelcomeSettings(guildId, { welcomeChannelId: channel?.id || null });
    await auditLog.log({ guildId, adminId: interaction.user.id, action: 'SET_WELCOME_CHANNEL', target: channel?.id || null });
    return interaction.reply({ embeds: [embeds.success(`Welcome channel set to ${channel ? `<#${channel.id}>` : 'Not set'}.`)], ephemeral: true });
  }

  if (mode === 'set-welcome-message') {
    const message = options.getString('message');
    await updateWelcomeSettings(guildId, { welcomeMessage: message });
    await auditLog.log({ guildId, adminId: interaction.user.id, action: 'SET_WELCOME_MESSAGE', details: message.slice(0, 200) });
    return interaction.reply({ embeds: [embeds.success('Welcome message updated.')], ephemeral: true });
  }

  if (mode === 'set-welcome-banner') {
    const url = options.getString('url');
    await updateWelcomeSettings(guildId, { welcomeBannerUrl: url });
    await auditLog.log({ guildId, adminId: interaction.user.id, action: 'SET_WELCOME_BANNER', details: url.slice(0, 200) });
    return interaction.reply({ embeds: [embeds.success('Welcome banner updated.')], ephemeral: true });
  }

  if (mode === 'set-welcome-thumbnail') {
    const url = options.getString('url');
    await updateWelcomeSettings(guildId, { welcomeThumbnailUrl: url });
    await auditLog.log({ guildId, adminId: interaction.user.id, action: 'SET_WELCOME_THUMBNAIL', details: url.slice(0, 200) });
    return interaction.reply({ embeds: [embeds.success('Welcome thumbnail updated.')], ephemeral: true });
  }

  if (mode === 'set-welcome-role') {
    const role = options.getRole('role');
    await updateWelcomeSettings(guildId, { welcomeRoleId: role?.id || null });
    await auditLog.log({ guildId, adminId: interaction.user.id, action: 'SET_WELCOME_ROLE', target: role?.id || null });
    return interaction.reply({ embeds: [embeds.success(`Welcome role set to ${role ? `<@&${role.id}>` : 'Not set'}.`)], ephemeral: true });
  }

  if (mode === 'remove-welcome-role') {
    await updateWelcomeSettings(guildId, { welcomeRoleId: null });
    await auditLog.log({ guildId, adminId: interaction.user.id, action: 'REMOVE_WELCOME_ROLE' });
    return interaction.reply({ embeds: [embeds.success('Welcome role removed.')], ephemeral: true });
  }

  if (mode === 'welcome-dm-enable' || mode === 'welcome-dm-disable') {
    const updated = await updateWelcomeSettings(guildId, { dmEnabled: mode === 'welcome-dm-enable' });
    await auditLog.log({ guildId, adminId: interaction.user.id, action: mode.toUpperCase() });
    return interaction.reply({ embeds: [embeds.success(`Welcome DMs ${updated.dmEnabled ? 'enabled' : 'disabled'}.`)], ephemeral: true });
  }

  if (mode === 'set-welcome-dm') {
    const message = options.getString('message');
    await updateWelcomeSettings(guildId, { dmMessage: message });
    await auditLog.log({ guildId, adminId: interaction.user.id, action: 'SET_WELCOME_DM', details: message.slice(0, 200) });
    return interaction.reply({ embeds: [embeds.success('Welcome DM message updated.')], ephemeral: true });
  }

  if (mode === 'set-welcome-button') {
    const slot = options.getInteger('slot');
    const label = options.getString('label');
    const targetValue = options.getString('target');
    try {
      await setWelcomeButton(guildId, slot, label, targetValue);
      await auditLog.log({ guildId, adminId: interaction.user.id, action: 'SET_WELCOME_BUTTON', target: `slot:${slot}`, details: `${label} -> ${targetValue}`.slice(0, 200) });
      return interaction.reply({ embeds: [embeds.success(`Welcome button ${slot} saved.`)], ephemeral: true });
    } catch (err) {
      return interaction.reply({ embeds: [embeds.error(err.message)], ephemeral: true });
    }
  }

  if (mode === 'remove-welcome-button') {
    const slot = options.getInteger('slot');
    try {
      await removeWelcomeButton(guildId, slot);
      await auditLog.log({ guildId, adminId: interaction.user.id, action: 'REMOVE_WELCOME_BUTTON', target: `slot:${slot}` });
      return interaction.reply({ embeds: [embeds.success(`Welcome button ${slot} removed.`)], ephemeral: true });
    } catch (err) {
      return interaction.reply({ embeds: [embeds.error(err.message)], ephemeral: true });
    }
  }

  return interaction.reply({ embeds: [embeds.error('Unknown welcome command.')], ephemeral: true });
}

module.exports = {
  buildWelcomeSlashCommand,
  handleWelcomePrefix,
  handleWelcomeInteraction,
};