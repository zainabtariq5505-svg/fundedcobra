const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const prisma = require('../database/prisma');
const logger = require('../utils/logger');
const { COLORS, FOOTER, truncate } = require('../utils/embeds');

const DEFAULT_WELCOME_MESSAGE = [
  'Welcome to FundedCobra, {user}! 🐍',
  'You’re now inside the home of serious forex traders.',
  'Check the rules, explore account options, and ask anything about funded accounts.',
].join('\n');

const DEFAULT_DM_MESSAGE = 'Welcome to FundedCobra, {user}! Start your funded journey by checking the rules, pricing, and support channels.';

function cleanUrl(value) {
  if (!value) return null;
  const text = String(value).trim();

  try {
    const parsed = new URL(text);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function extractSnowflake(value) {
  if (!value) return null;
  const match = String(value).match(/\d{15,20}/);
  return match ? match[0] : null;
}

function normalizeChannelUrl(value, guildId) {
  const url = cleanUrl(value);
  if (url) return url;

  const channelId = extractSnowflake(value);
  if (channelId && guildId) {
    return `https://discord.com/channels/${guildId}/${channelId}`;
  }

  return null;
}

function mentionChannel(channelId, fallbackText) {
  return channelId ? `<#${channelId}>` : fallbackText;
}

function replaceVariables(template, context) {
  const replacements = {
    '{user}': `<@${context.userId}>`,
    '{username}': context.username,
    '{server}': context.serverName,
    '{memberCount}': String(context.memberCount),
    '{rulesChannel}': context.rulesChannel,
    '{supportChannel}': context.supportChannel,
    '{pricingChannel}': context.pricingChannel,
  };

  return Object.entries(replacements).reduce((text, [token, value]) => text.split(token).join(value || ''), template || '');
}

async function getWelcomeSettings(guildId) {
  return prisma.welcomeSettings.upsert({
    where: { guildId },
    create: { guildId },
    update: {},
  });
}

async function updateWelcomeSettings(guildId, data) {
  await getWelcomeSettings(guildId);
  return prisma.welcomeSettings.update({
    where: { guildId },
    data,
  });
}

async function getGuildContext(guildId) {
  const [welcomeSettings, guildSettings] = await Promise.all([
    getWelcomeSettings(guildId),
    prisma.guildSettings.findUnique({ where: { guildId } }).catch(() => null),
  ]);

  return { welcomeSettings, guildSettings };
}

function buildWelcomeButtons(welcomeSettings, guildId) {
  const buttons = [];

  for (let slot = 1; slot <= 5; slot += 1) {
    const label = welcomeSettings[`button${slot}Label`];
    const target = welcomeSettings[`button${slot}Url`];
    const url = normalizeChannelUrl(target, guildId);

    if (!label || !url) continue;

    buttons.push(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel(truncate(label, 80))
        .setURL(url)
    );
  }

  return buttons.length ? [new ActionRowBuilder().addComponents(buttons.slice(0, 5))] : [];
}

function buildWelcomeEmbed({ guild, member, welcomeSettings, guildSettings, isPreview = false }) {
  const rulesChannel = mentionChannel(guildSettings?.rulesChannelId, 'the rules channel');
  const supportChannel = mentionChannel(guildSettings?.supportChannelId, 'the support channel');
  const pricingChannel = mentionChannel(guildSettings?.pricingChannelId, 'the pricing channel');

  const message = replaceVariables(
    welcomeSettings.welcomeMessage || DEFAULT_WELCOME_MESSAGE,
    {
      userId: member.id,
      username: member.user.username,
      serverName: guild.name,
      memberCount: guild.memberCount || guild.members.cache.size || 0,
      rulesChannel,
      supportChannel,
      pricingChannel,
    }
  );

  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setTitle('Welcome to FundedCobra')
    .setDescription(message)
    .addFields(
      { name: 'Start Your Funded Journey', value: 'Read the rules, review pricing, and ask anything about funded accounts.', inline: false },
      { name: 'Quick Start', value: `1. Check ${rulesChannel}\n2. Review ${pricingChannel}\n3. Ask support in ${supportChannel}`, inline: false },
      { name: 'Useful Server Channels', value: `Rules: ${rulesChannel}\nSupport: ${supportChannel}\nPricing: ${pricingChannel}`, inline: false },
    )
    .setFooter(FOOTER)
    .setTimestamp();

  if (cleanUrl(welcomeSettings.welcomeBannerUrl)) {
    embed.setImage(welcomeSettings.welcomeBannerUrl);
  }

  if (cleanUrl(welcomeSettings.welcomeThumbnailUrl)) {
    embed.setThumbnail(welcomeSettings.welcomeThumbnailUrl);
  }

  if (!isPreview) {
    embed.setAuthor({
      name: member.displayName || member.user.username,
      iconURL: member.displayAvatarURL?.({ size: 128 }) || member.user.displayAvatarURL?.({ size: 128 }),
    });
  }

  return embed;
}

function buildWelcomeSummaryEmbed(guild, welcomeSettings, guildSettings) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.GOLD)
    .setTitle('FundedCobra Welcome System')
    .setDescription('Current welcome configuration for this server.')
    .addFields(
      { name: 'Enabled', value: welcomeSettings.enabled ? '✅ Yes' : '❌ No', inline: true },
      { name: 'Welcome Channel', value: mentionChannel(welcomeSettings.welcomeChannelId, 'Not set'), inline: true },
      { name: 'Welcome Role', value: welcomeSettings.welcomeRoleId ? `<@&${welcomeSettings.welcomeRoleId}>` : 'Not set', inline: true },
      { name: 'DM Enabled', value: welcomeSettings.dmEnabled ? '✅ Yes' : '❌ No', inline: true },
      { name: 'Banner', value: welcomeSettings.welcomeBannerUrl ? 'Configured' : 'Not set', inline: true },
      { name: 'Thumbnail', value: welcomeSettings.welcomeThumbnailUrl ? 'Configured' : 'Not set', inline: true },
      { name: 'Useful Server Channels', value: `Rules: ${mentionChannel(guildSettings?.rulesChannelId, 'Not set')}\nSupport: ${mentionChannel(guildSettings?.supportChannelId, 'Not set')}\nPricing: ${mentionChannel(guildSettings?.pricingChannelId, 'Not set')}`, inline: false },
    )
    .setFooter(FOOTER)
    .setTimestamp();

  if (welcomeSettings.welcomeMessage) {
    embed.addFields({ name: 'Welcome Message', value: truncate(welcomeSettings.welcomeMessage, 900), inline: false });
  }

  const buttonRows = [];
  for (let slot = 1; slot <= 5; slot += 1) {
    const label = welcomeSettings[`button${slot}Label`];
    const url = welcomeSettings[`button${slot}Url`];
    if (label && url) {
      buttonRows.push(`Slot ${slot}: ${label}`);
    }
  }

  if (buttonRows.length) {
    embed.addFields({ name: 'Buttons', value: buttonRows.join('\n'), inline: false });
  }

  return embed;
}

async function logWelcomeEvent({ guildId, userId, username, welcomeChannelId, dmSent, roleAssigned, joinedAt }) {
  try {
    await prisma.welcomeLog.create({
      data: {
        guildId,
        userId,
        username,
        welcomeChannelId,
        dmSent,
        roleAssigned,
        joinedAt,
      },
    });
  } catch (err) {
    logger.error('Failed to save welcome log entry:', err);
  }
}

async function sendWelcomeForMember(member) {
  const guild = member.guild;
  const { welcomeSettings, guildSettings } = await getGuildContext(guild.id);

  if (!welcomeSettings.enabled) {
    return { sent: false, dmSent: false, roleAssigned: false, skipped: true };
  }

  const embed = buildWelcomeEmbed({ guild, member, welcomeSettings, guildSettings });
  const components = buildWelcomeButtons(welcomeSettings, guild.id);
  let sent = false;
  let dmSent = false;
  let roleAssigned = false;

  const joinedAt = member.joinedAt || new Date();
  const welcomeChannelId = welcomeSettings.welcomeChannelId || null;
  const welcomeChannel = welcomeChannelId ? await guild.channels.fetch(welcomeChannelId).catch(() => null) : null;

  if (!welcomeChannel || typeof welcomeChannel.send !== 'function') {
    logger.error(`Welcome channel is missing or invalid for guild ${guild.id}.`);
  } else {
    try {
      await welcomeChannel.send({ content: `<@${member.id}>`, embeds: [embed], components });
      sent = true;
    } catch (err) {
      logger.error(`Failed to send welcome message in guild ${guild.id}:`, err);
    }
  }

  if (welcomeSettings.dmEnabled) {
    const dmMessage = replaceVariables(
      welcomeSettings.dmMessage || DEFAULT_DM_MESSAGE,
      {
        userId: member.id,
        username: member.user.username,
        serverName: guild.name,
        memberCount: guild.memberCount || guild.members.cache.size || 0,
        rulesChannel: mentionChannel(guildSettings?.rulesChannelId, 'the rules channel'),
        supportChannel: mentionChannel(guildSettings?.supportChannelId, 'the support channel'),
        pricingChannel: mentionChannel(guildSettings?.pricingChannelId, 'the pricing channel'),
      }
    );

    try {
      await member.send({ content: dmMessage });
      dmSent = true;
    } catch (err) {
      logger.debug(`Welcome DM could not be delivered to ${member.id}: ${err?.message || err}`);
    }
  }

  if (welcomeSettings.welcomeRoleId) {
    const role = guild.roles.cache.get(welcomeSettings.welcomeRoleId);
    if (!role) {
      logger.error(`Welcome role ${welcomeSettings.welcomeRoleId} is missing in guild ${guild.id}.`);
    } else if (!member.roles.cache.has(role.id)) {
      try {
        await member.roles.add(role.id);
        roleAssigned = true;
      } catch (err) {
        logger.error(`Failed to assign welcome role ${role.id} in guild ${guild.id}:`, err);
      }
    } else {
      roleAssigned = true;
    }
  }

  await logWelcomeEvent({ guildId: guild.id, userId: member.id, username: member.user.username, welcomeChannelId, dmSent, roleAssigned, joinedAt });

  return { sent, dmSent, roleAssigned, skipped: false };
}

async function previewWelcomePayload(member) {
  const guild = member.guild;
  const { welcomeSettings, guildSettings } = await getGuildContext(guild.id);
  const embed = buildWelcomeEmbed({ guild, member, welcomeSettings, guildSettings, isPreview: true });
  const components = buildWelcomeButtons(welcomeSettings, guild.id);
  return { embeds: [embed], components };
}

async function setWelcomeButton(guildId, slot, label, urlOrChannel) {
  const numericSlot = Number(slot);
  if (!Number.isInteger(numericSlot) || numericSlot < 1 || numericSlot > 5) {
    throw new Error('Button slot must be between 1 and 5.');
  }

  const url = normalizeChannelUrl(urlOrChannel, guildId);
  if (!url) {
    throw new Error('Provide a valid URL, channel mention, or channel ID.');
  }

  return updateWelcomeSettings(guildId, { [`button${numericSlot}Label`]: label, [`button${numericSlot}Url`]: url });
}

async function removeWelcomeButton(guildId, slot) {
  const numericSlot = Number(slot);
  if (!Number.isInteger(numericSlot) || numericSlot < 1 || numericSlot > 5) {
    throw new Error('Button slot must be between 1 and 5.');
  }

  return updateWelcomeSettings(guildId, { [`button${numericSlot}Label`]: null, [`button${numericSlot}Url`]: null });
}

module.exports = {
  DEFAULT_DM_MESSAGE,
  DEFAULT_WELCOME_MESSAGE,
  buildWelcomeEmbed,
  buildWelcomeSummaryEmbed,
  getWelcomeSettings,
  logWelcomeEvent,
  normalizeChannelUrl,
  previewWelcomePayload,
  removeWelcomeButton,
  replaceVariables,
  sendWelcomeForMember,
  setWelcomeButton,
  updateWelcomeSettings,
};