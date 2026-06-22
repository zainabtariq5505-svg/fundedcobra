const { EmbedBuilder } = require('discord.js');
const prisma = require('../database/prisma');
const logger = require('../utils/logger');
const { COLORS, FOOTER, truncate } = require('../utils/embeds');

const DEFAULT_BOOSTER_MESSAGE = '🎉 {user} just boosted {server}! Thank you for supporting {brand} 🐍';
const DEFAULT_DM_MESSAGE = 'Thank you for boosting FundedCobra! We appreciate your support. 🐍 @fundedcobra';

function cleanUrl(value) {
  if (!value) return null;
  try {
    const parsed = new URL(String(value).trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function replaceBoosterVariables(template, context) {
  const now = new Date();
  const replacements = {
    '{user}': `<@${context.userId}>`,
    '{username}': context.username,
    '{server}': context.serverName,
    '{memberCount}': String(context.memberCount),
    '{boostCount}': String(context.boostCount),
    '{boostTier}': String(context.boostTier),
    '{date}': now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    '{time}': now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC',
    '{brand}': 'FundedCobra',
  };
  return Object.entries(replacements).reduce(
    (text, [token, value]) => text.split(token).join(value ?? ''),
    template || ''
  );
}

async function getBoosterSettings(guildId) {
  return prisma.boosterSettings.upsert({
    where: { guildId },
    create: { guildId },
    update: {},
  });
}

async function updateBoosterSettings(guildId, data) {
  await getBoosterSettings(guildId);
  return prisma.boosterSettings.update({ where: { guildId }, data });
}

function buildBoosterEmbed({ guild, member, settings, isPreview = false }) {
  const context = {
    userId: member.id,
    username: member.user?.username || member.displayName || 'Unknown',
    serverName: guild.name,
    memberCount: guild.memberCount || 0,
    boostCount: guild.premiumSubscriptionCount || 0,
    boostTier: guild.premiumTier || 0,
  };

  const description = replaceBoosterVariables(
    settings.boosterMessage || DEFAULT_BOOSTER_MESSAGE,
    context
  );

  const embed = new EmbedBuilder()
    .setColor(COLORS.PURPLE)
    .setTitle('🎉 BOOSTER PARTY 🎉')
    .setDescription(description)
    .addFields(
      { name: '👑 Booster', value: `<@${member.id}>`, inline: true },
      { name: '🏰 Server', value: guild.name, inline: true },
      { name: '⚡ Boost Tier', value: `Tier ${guild.premiumTier || 0}`, inline: true },
      { name: '🚀 Total Boosts', value: String(guild.premiumSubscriptionCount || 0), inline: true },
      { name: '⏰ Boosting Since', value: isPreview ? 'Just now' : `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
    )
    .setFooter(FOOTER)
    .setTimestamp();

  if (!isPreview) {
    embed.setAuthor({
      name: member.displayName || member.user?.username || 'Booster',
      iconURL: member.displayAvatarURL?.({ size: 128 }) || member.user?.displayAvatarURL?.({ size: 128 }),
    });
  }

  if (cleanUrl(settings.bannerUrl)) {
    embed.setImage(settings.bannerUrl);
  }

  if (cleanUrl(settings.thumbnailUrl)) {
    embed.setThumbnail(settings.thumbnailUrl);
  }

  return embed;
}

function buildBoosterStatEmbed(guild, settings, latestBooster) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.PURPLE)
    .setTitle('🐍 FundedCobra Booster Stats')
    .setDescription(`Server boost statistics for **${guild.name}**`)
    .addFields(
      { name: '⚡ Boost Tier', value: `Tier ${guild.premiumTier || 0}`, inline: true },
      { name: '🚀 Total Boosts', value: String(guild.premiumSubscriptionCount || 0), inline: true },
      { name: '👥 Current Boosters', value: String(guild.members?.cache?.filter(m => m.premiumSince).size || 0), inline: true },
      { name: '📢 Booster Channel', value: settings.boosterChannelId ? `<#${settings.boosterChannelId}>` : 'Not set', inline: true },
      { name: '🎭 Booster Role', value: settings.boosterRoleId ? `<@&${settings.boosterRoleId}>` : 'Not set', inline: true },
      { name: '✅ System Enabled', value: settings.enabled ? '✅ Yes' : '❌ No', inline: true },
    )
    .setFooter(FOOTER)
    .setTimestamp();

  if (latestBooster) {
    embed.addFields({ name: '🌟 Latest Booster', value: `<@${latestBooster.userId}> — <t:${Math.floor(new Date(latestBooster.createdAt).getTime() / 1000)}:R>`, inline: false });
  }

  return embed;
}

function buildBoosterListEmbed(guild, boosters) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.PURPLE)
    .setTitle(`👑 ${guild.name} — Current Boosters`)
    .setFooter(FOOTER)
    .setTimestamp();

  if (!boosters.length) {
    embed.setDescription('No current boosters found.');
    return embed;
  }

  const lines = boosters.map((m, i) => {
    const since = m.premiumSince ? `<t:${Math.floor(m.premiumSince.getTime() / 1000)}:d>` : 'Unknown';
    return `**${i + 1}.** <@${m.id}> — boosting since ${since}`;
  });

  embed.setDescription(truncate(lines.join('\n'), 4000));
  return embed;
}

function buildBoosterLogsEmbed(guild, logs) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.GOLD)
    .setTitle(`📋 ${guild.name} — Booster Logs`)
    .setFooter(FOOTER)
    .setTimestamp();

  if (!logs.length) {
    embed.setDescription('No boost events recorded yet.');
    return embed;
  }

  const lines = logs.map((log, i) => {
    const ts = `<t:${Math.floor(new Date(log.createdAt).getTime() / 1000)}:R>`;
    const roleStatus = log.roleAssigned ? '🎭' : '';
    const dmStatus = log.dmSent ? '📨' : '';
    return `**${i + 1}.** <@${log.userId}> (${log.username}) — ${ts} ${roleStatus}${dmStatus}`;
  });

  embed.setDescription(truncate(lines.join('\n'), 4000));
  return embed;
}

function buildBoosterSummaryEmbed(guild, settings) {
  return new EmbedBuilder()
    .setColor(COLORS.PURPLE)
    .setTitle('🐍 Booster Appreciation System')
    .setDescription('Current booster system configuration.')
    .addFields(
      { name: 'Enabled', value: settings.enabled ? '✅ Yes' : '❌ No', inline: true },
      { name: 'Booster Channel', value: settings.boosterChannelId ? `<#${settings.boosterChannelId}>` : 'Not set', inline: true },
      { name: 'Booster Role', value: settings.boosterRoleId ? `<@&${settings.boosterRoleId}>` : 'Not set', inline: true },
      { name: 'DM Enabled', value: settings.boosterDmEnabled ? '✅ Yes' : '❌ No', inline: true },
      { name: 'Banner', value: settings.bannerUrl ? '✅ Set' : 'Not set', inline: true },
      { name: 'Thumbnail', value: settings.thumbnailUrl ? '✅ Set' : 'Not set', inline: true },
    )
    .setFooter(FOOTER)
    .setTimestamp();
}

async function logBoostEvent({ guildId, userId, username, boostStartedAt, boostTier, serverBoostCount, channelId, messageId, roleAssigned, dmSent }) {
  try {
    await prisma.boosterLog.create({
      data: { guildId, userId, username, boostStartedAt, boostTier, serverBoostCount, channelId: channelId || null, messageId: messageId || null, roleAssigned, dmSent },
    });
  } catch (err) {
    logger.error('Failed to save booster log:', err);
  }
}

async function handleNewBoost(member, client) {
  const guild = member.guild;
  const guildId = guild.id;

  let settings;
  try {
    settings = await getBoosterSettings(guildId);
  } catch (err) {
    logger.error(`Failed to fetch booster settings for guild ${guildId}:`, err);
    return;
  }

  if (!settings.enabled) return;

  const embed = buildBoosterEmbed({ guild, member, settings });
  let channelId = null;
  let messageId = null;
  let roleAssigned = false;
  let dmSent = false;

  // Send boost message to configured channel
  if (settings.boosterChannelId) {
    try {
      const channel = await guild.channels.fetch(settings.boosterChannelId).catch(() => null);
      if (channel && typeof channel.send === 'function') {
        const sent = await channel.send({ content: `<@${member.id}>`, embeds: [embed] });
        channelId = channel.id;
        messageId = sent.id;

        // Add reactions
        try {
          const reactions = JSON.parse(settings.reactionsJson || '[]');
          for (const emoji of reactions) {
            await sent.react(emoji).catch(() => {});
          }
        } catch {
          // Ignore reaction errors
        }
      } else {
        logger.error(`Booster channel ${settings.boosterChannelId} is missing or invalid for guild ${guildId}.`);
      }
    } catch (err) {
      logger.error(`Failed to send booster message in guild ${guildId}:`, err);
    }
  } else {
    logger.warn(`Booster system enabled but no channel set for guild ${guildId}.`);
  }

  // Assign booster role
  if (settings.boosterRoleId) {
    try {
      const role = guild.roles.cache.get(settings.boosterRoleId);
      if (!role) {
        logger.error(`Booster role ${settings.boosterRoleId} not found in guild ${guildId}.`);
      } else if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role.id);
        roleAssigned = true;
      } else {
        roleAssigned = true;
      }
    } catch (err) {
      logger.error(`Failed to assign booster role in guild ${guildId}:`, err);
    }
  }

  // DM the booster
  if (settings.boosterDmEnabled) {
    try {
      const context = {
        userId: member.id,
        username: member.user?.username || 'Unknown',
        serverName: guild.name,
        memberCount: guild.memberCount || 0,
        boostCount: guild.premiumSubscriptionCount || 0,
        boostTier: guild.premiumTier || 0,
      };
      const dmText = replaceBoosterVariables(settings.boosterDmMessage || DEFAULT_DM_MESSAGE, context);
      await member.send({ content: dmText });
      dmSent = true;
    } catch {
      // DM failures are expected and safe to ignore
    }
  }

  await logBoostEvent({
    guildId,
    userId: member.id,
    username: member.user?.username || member.displayName || 'Unknown',
    boostStartedAt: member.premiumSince || new Date(),
    boostTier: guild.premiumTier || 0,
    serverBoostCount: guild.premiumSubscriptionCount || 0,
    channelId,
    messageId,
    roleAssigned,
    dmSent,
  });
}

async function previewBoostPayload(member) {
  const guild = member.guild;
  const settings = await getBoosterSettings(guild.id);
  const embed = buildBoosterEmbed({ guild, member, settings, isPreview: true });
  return { content: `<@${member.id}>`, embeds: [embed] };
}

module.exports = {
  DEFAULT_BOOSTER_MESSAGE,
  DEFAULT_DM_MESSAGE,
  cleanUrl,
  getBoosterSettings,
  updateBoosterSettings,
  buildBoosterEmbed,
  buildBoosterStatEmbed,
  buildBoosterListEmbed,
  buildBoosterLogsEmbed,
  buildBoosterSummaryEmbed,
  handleNewBoost,
  previewBoostPayload,
  logBoostEvent,
};
