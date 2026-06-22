const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const prisma = require('../database/prisma');
const logger = require('../utils/logger');
const { COLORS, FOOTER, truncate } = require('../utils/embeds');

async function getAutoRoleSettings(guildId) {
  return prisma.autoRoleSettings.upsert({
    where: { guildId },
    create: { guildId },
    update: {},
  });
}

async function updateAutoRoleSettings(guildId, data) {
  await getAutoRoleSettings(guildId);
  return prisma.autoRoleSettings.update({ where: { guildId }, data });
}

async function logAutoRoleEvent({ guildId, userId, username, roleId, roleName, status, errorMessage, assignedAt }) {
  try {
    await prisma.autoRoleLog.create({
      data: { guildId, userId, username, roleId: roleId || null, roleName: roleName || null, status, errorMessage: errorMessage || null, assignedAt },
    });
  } catch (err) {
    logger.error('Failed to save auto role log:', err);
  }
}

function buildAutoRoleStatusEmbed(guild, settings, totalAssigned, lastLog) {
  return new EmbedBuilder()
    .setColor(COLORS.GOLD)
    .setTitle('🎭 Auto Role System — Status')
    .setDescription(`Auto role configuration for **${guild.name}**`)
    .addFields(
      { name: 'Enabled', value: settings.enabled ? '✅ Yes' : '❌ No', inline: true },
      { name: 'Auto Role', value: settings.roleId ? `<@&${settings.roleId}>` : 'Not set', inline: true },
      { name: 'Ignore Bots', value: settings.ignoreBots ? '✅ Yes' : '❌ No', inline: true },
      { name: 'Delay', value: settings.delaySeconds > 0 ? `${settings.delaySeconds}s` : 'None', inline: true },
      { name: 'Log Channel', value: settings.logChannelId ? `<#${settings.logChannelId}>` : 'Not set', inline: true },
      { name: 'Total Assigned', value: String(totalAssigned), inline: true },
    )
    .setFooter(FOOTER)
    .setTimestamp();
}

function buildAutoRoleLogsEmbed(guild, logs) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.GOLD)
    .setTitle(`📋 ${guild.name} — Auto Role Logs`)
    .setFooter(FOOTER)
    .setTimestamp();

  if (!logs.length) {
    embed.setDescription('No auto-role events recorded yet.');
    return embed;
  }

  const lines = logs.map((log, i) => {
    const ts = `<t:${Math.floor(new Date(log.assignedAt).getTime() / 1000)}:R>`;
    const statusEmoji = log.status === 'success' ? '✅' : '❌';
    const err = log.errorMessage ? ` — ${log.errorMessage}` : '';
    return `**${i + 1}.** ${statusEmoji} <@${log.userId}> (${log.username}) — ${ts}${err}`;
  });

  embed.setDescription(truncate(lines.join('\n'), 4000));
  return embed;
}

async function assignAutoRole(member, client) {
  const guild = member.guild;
  const guildId = guild.id;
  const assignedAt = new Date();

  let settings;
  try {
    settings = await getAutoRoleSettings(guildId);
  } catch (err) {
    logger.error(`Failed to fetch auto role settings for guild ${guildId}:`, err);
    return;
  }

  if (!settings.enabled || !settings.roleId) return;
  if (settings.ignoreBots && member.user?.bot) return;

  const userId = member.id;
  const username = member.user?.username || member.displayName || 'Unknown';

  const doAssign = async () => {
    // Safety checks
    const botMember = guild.members.me;
    if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
      logger.error(`Auto role: Bot lacks Manage Roles in guild ${guildId}.`);
      await logAutoRoleEvent({ guildId, userId, username, roleId: settings.roleId, roleName: settings.roleName, status: 'failed', errorMessage: 'Bot lacks Manage Roles permission', assignedAt });
      return;
    }

    const role = guild.roles.cache.get(settings.roleId);
    if (!role) {
      logger.error(`Auto role: Role ${settings.roleId} not found in guild ${guildId}. Disabling autorole.`);
      await updateAutoRoleSettings(guildId, { enabled: false });
      await logAutoRoleEvent({ guildId, userId, username, roleId: settings.roleId, roleName: settings.roleName, status: 'failed', errorMessage: 'Role not found — autorole disabled', assignedAt });
      return;
    }

    if (role.managed) {
      logger.error(`Auto role: Role ${role.id} is managed by an integration.`);
      await logAutoRoleEvent({ guildId, userId, username, roleId: role.id, roleName: role.name, status: 'failed', errorMessage: 'Role is managed by an integration', assignedAt });
      return;
    }

    if (role.id === guild.id) {
      logger.error(`Auto role: Attempted to assign @everyone in guild ${guildId}.`);
      await logAutoRoleEvent({ guildId, userId, username, roleId: role.id, roleName: role.name, status: 'failed', errorMessage: 'Cannot assign @everyone', assignedAt });
      return;
    }

    if (botMember.roles.highest.comparePositionTo(role) <= 0) {
      logger.error(`Auto role: Bot role is not above target role ${role.id} in guild ${guildId}.`);
      await logAutoRoleEvent({ guildId, userId, username, roleId: role.id, roleName: role.name, status: 'failed', errorMessage: 'Bot role must be above the target role', assignedAt });
      return;
    }

    // Re-fetch member to verify they're still in server
    const freshMember = await guild.members.fetch(userId).catch(() => null);
    if (!freshMember) {
      logger.warn(`Auto role: Member ${userId} left before role could be assigned in guild ${guildId}.`);
      return;
    }

    try {
      await freshMember.roles.add(role.id);
      await logAutoRoleEvent({ guildId, userId, username, roleId: role.id, roleName: role.name, status: 'success', assignedAt });

      // Send log embed to configured log channel
      if (settings.logChannelId) {
        try {
          const logChannel = await guild.channels.fetch(settings.logChannelId).catch(() => null);
          if (logChannel && typeof logChannel.send === 'function') {
            const logEmbed = new EmbedBuilder()
              .setColor(COLORS.GREEN)
              .setTitle('🎭 Auto Role Assigned')
              .addFields(
                { name: 'Member', value: `<@${userId}> (${username})`, inline: true },
                { name: 'Role', value: `<@&${role.id}>`, inline: true },
                { name: 'Status', value: '✅ Success', inline: true },
                { name: 'Time', value: `<t:${Math.floor(assignedAt.getTime() / 1000)}:F>`, inline: false },
              )
              .setFooter(FOOTER)
              .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
          }
        } catch {
          // Log channel send failures are non-critical
        }
      }
    } catch (err) {
      logger.error(`Auto role: Failed to assign role ${role.id} to ${userId} in guild ${guildId}:`, err);
      await logAutoRoleEvent({ guildId, userId, username, roleId: role.id, roleName: role.name, status: 'failed', errorMessage: err.message || String(err), assignedAt });
    }
  };

  if (settings.delaySeconds > 0) {
    setTimeout(() => { doAssign().catch(() => {}); }, settings.delaySeconds * 1000);
  } else {
    await doAssign();
  }
}

module.exports = {
  getAutoRoleSettings,
  updateAutoRoleSettings,
  logAutoRoleEvent,
  buildAutoRoleStatusEmbed,
  buildAutoRoleLogsEmbed,
  assignAutoRole,
};
