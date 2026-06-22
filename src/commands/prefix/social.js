const { EmbedBuilder } = require('discord.js');
const prisma = require('../../database/prisma');
const embeds = require('../../utils/embeds');
const { checkAdminMessage } = require('../../utils/adminCheck');
const { checkAllAccounts, sendTestNotification, getSettings, PLATFORM_ICONS, DEFAULT_TEMPLATES } = require('../../services/socialNotifierService');

const FOOTER = { text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' };
const VALID_PLATFORMS = ['youtube', 'instagram', 'x', 'tiktok'];

module.exports = {
  name: 'social-add',
  aliases: [
    'social-remove', 'social-list', 'social-channel', 'social-ping',
    'social-message', 'social-test', 'social-enable', 'social-disable',
    'social-check-now', 'social-logs', 'set-social-banner', 'set-social-thumbnail',
    'social-reactions', 'social-set-token',
  ],
  description: 'Social media notifier management',
  usage: '!social-add <platform> <handle_or_url> | !social-list | !social-channel #channel | !social-ping @role/everyone/here/none',

  async execute(message, args, client, cmdName) {
    if (!await checkAdminMessage(message)) return;
    if (!message.guild) return;

    const guildId = message.guild.id;
    const cmd = (cmdName || 'social-add').toLowerCase().replace(/social-?/, '').replace(/-/g, '');

    // ── social-list ────────────────────────────────────────────────────────────────
    if (cmd === 'list') {
      const accounts = await prisma.socialAccount.findMany({ where: { guildId }, orderBy: { createdAt: 'asc' } });
      if (!accounts.length) return message.reply({ embeds: [embeds.info('No social accounts configured. Use `!social-add <platform> <handle>` to add one.')] });

      const embed = new EmbedBuilder()
        .setColor(0x1A1A2E)
        .setTitle('📱 Social Media Accounts')
        .setFooter(FOOTER)
        .setTimestamp();

      for (const acc of accounts) {
        const icon   = PLATFORM_ICONS[acc.platform] ?? '📡';
        const status = acc.enabled ? '🟢 Active' : '🔴 Disabled';
        const last   = acc.lastCheckedAt ? `<t:${Math.floor(new Date(acc.lastCheckedAt).getTime() / 1000)}:R>` : 'Never';
        embed.addFields({
          name:  `${icon} ${acc.accountName} (${acc.platform})`,
          value: `Status: ${status}\nID: \`${acc.id.slice(-8)}\`\nLast checked: ${last}${acc.accountUrl ? `\n[Profile](${acc.accountUrl})` : ''}`,
          inline: true,
        });
      }
      return message.reply({ embeds: [embed] });
    }

    // ── social-add <platform> <handle/url> ────────────────────────────────────────
    if (cmd === 'add') {
      const platform = args[0]?.toLowerCase();
      if (!VALID_PLATFORMS.includes(platform)) {
        return message.reply({ embeds: [embeds.error(`Invalid platform. Valid options: \`${VALID_PLATFORMS.join('`, `')}\``)] });
      }
      const handle = args.slice(1).join(' ');
      if (!handle) return message.reply({ embeds: [embeds.error(`Usage: \`!social-add ${platform} <handle_or_url>\`\n\nExamples:\n• YouTube: \`!social-add youtube UCxxxxxxxxxxxxxxxxxx\`\n• X: \`!social-add x @fundedcobra\`\n• Instagram: \`!social-add instagram fundedcobra\`\n• TikTok: \`!social-add tiktok @fundedcobra\``)] });

      // Extract YouTube channel ID from URL if needed
      let externalId = null;
      let accountUrl = handle;
      let accountHandle = handle;

      if (platform === 'youtube') {
        const channelIdMatch = handle.match(/(?:youtube\.com\/channel\/|^)(UC[a-zA-Z0-9_-]{22})/);
        if (channelIdMatch) {
          externalId    = channelIdMatch[1];
          accountUrl    = `https://www.youtube.com/channel/${externalId}`;
          accountHandle = externalId;
        } else {
          return message.reply({ embeds: [embeds.error('For YouTube, provide the channel ID (starts with UC...).\n\nFind it: Go to the channel → About → Share → Copy channel ID.')] });
        }
      }

      if (platform === 'instagram' || platform === 'tiktok') {
        await message.reply({ embeds: [embeds.info(`**${platform.charAt(0).toUpperCase() + platform.slice(1)} API Setup Required**\n\nOfficial ${platform} API requires OAuth setup.\n\nThis account has been saved, but notifications will not post until the official API is configured.\n\nContact your developer to configure the ${platform} API integration.`)] });
      }

      const account = await prisma.socialAccount.create({
        data: {
          guildId,
          platform,
          accountName:       handle.replace('@', ''),
          accountHandle:     accountHandle.replace('@', ''),
          accountUrl:        accountUrl.startsWith('http') ? accountUrl : null,
          externalAccountId: externalId,
          createdBy:         message.author.id,
        },
      });

      return message.reply({ embeds: [embeds.success(`${PLATFORM_ICONS[platform] ?? '📡'} **${platform.charAt(0).toUpperCase() + platform.slice(1)}** account \`${handle}\` added!\n\nAccount ID: \`${account.id.slice(-8)}\`\n\nNext steps:\n• Set notification channel: \`!social-channel #channel\`\n• Test it: \`!social-test ${account.id.slice(-8)}\``)] });
    }

    // ── social-remove <id> ────────────────────────────────────────────────────────
    if (cmd === 'remove') {
      const id = args[0];
      if (!id) return message.reply({ embeds: [embeds.error('Usage: `!social-remove <id>`')] });
      const account = await prisma.socialAccount.findFirst({ where: { guildId, OR: [{ id }, { id: { endsWith: id } }] } });
      if (!account) return message.reply({ embeds: [embeds.error('Account not found.')] });
      await prisma.socialAccount.delete({ where: { id: account.id } });
      return message.reply({ embeds: [embeds.success(`Removed **${account.accountName}** (${account.platform}).`)] });
    }

    // ── social-channel #channel ────────────────────────────────────────────────────
    if (cmd === 'channel') {
      const channel = message.mentions.channels.first();
      if (!channel) return message.reply({ embeds: [embeds.error('Usage: `!social-channel #channel`')] });
      await prisma.socialNotifierSettings.upsert({
        where:  { guildId },
        create: { guildId, notificationChannelId: channel.id },
        update: { notificationChannelId: channel.id },
      });
      return message.reply({ embeds: [embeds.success(`Notification channel set to <#${channel.id}>.`)] });
    }

    // ── social-ping @role/everyone/here/none ──────────────────────────────────────
    if (cmd === 'ping') {
      const input = args[0]?.toLowerCase();
      let pingType = 'none', pingRoleId = null;

      if (input === 'everyone') { pingType = 'everyone'; }
      else if (input === 'here') { pingType = 'here'; }
      else if (input === 'none')  { pingType = 'none'; }
      else {
        const role = message.mentions.roles.first();
        if (role) { pingType = 'role'; pingRoleId = role.id; }
        else return message.reply({ embeds: [embeds.error('Usage: `!social-ping @role/everyone/here/none`')] });
      }

      const confirmRequired = pingType === 'everyone' || pingType === 'here';
      if (confirmRequired) {
        await message.reply({ embeds: [embeds.info(`⚠️ You are enabling **@${pingType}** for social notifications. This will ping everyone in the server when a new post is detected.\n\nThis has been saved. Use \`!social-ping none\` to disable.`)] });
      }

      await prisma.socialNotifierSettings.upsert({
        where:  { guildId },
        create: { guildId, pingType, pingRoleId },
        update: { pingType, pingRoleId },
      });

      const pingLabel = pingType === 'role' ? `<@&${pingRoleId}>` : `@${pingType}`;
      return message.reply({ embeds: [embeds.success(`Ping type set to **${pingLabel}**.`)] });
    }

    // ── social-message <platform> <template> ──────────────────────────────────────
    if (cmd === 'message') {
      const platform = args[0]?.toLowerCase();
      if (!VALID_PLATFORMS.includes(platform)) {
        return message.reply({ embeds: [embeds.error(`Valid platforms: \`${VALID_PLATFORMS.join('`, `')}\``)] });
      }
      const template = args.slice(1).join(' ');
      if (!template) {
        const defaults = Object.entries(DEFAULT_TEMPLATES).map(([p, t]) => `**${p}:** ${t}`).join('\n');
        return message.reply({ embeds: [embeds.info(`**Current Default Templates:**\n\n${defaults}\n\n**Variables:** \`{ping}\` \`{platform}\` \`{accountName}\` \`{title}\` \`{url}\` \`{publishedAt}\` \`{server}\` \`{brand}\``)] });
      }
      const key = `${platform}Template`;
      await prisma.socialNotifierSettings.upsert({
        where:  { guildId },
        create: { guildId, [key]: template },
        update: { [key]: template },
      });
      return message.reply({ embeds: [embeds.success(`Template for **${platform}** updated:\n> ${template}`)] });
    }

    // ── social-enable / social-disable <id> ───────────────────────────────────────
    if (cmd === 'enable' || cmd === 'disable') {
      const id = args[0];
      if (!id) return message.reply({ embeds: [embeds.error(`Usage: \`!social-${cmd} <id>\``)] });
      const account = await prisma.socialAccount.findFirst({ where: { guildId, OR: [{ id }, { id: { endsWith: id } }] } });
      if (!account) return message.reply({ embeds: [embeds.error('Account not found.')] });
      await prisma.socialAccount.update({ where: { id: account.id }, data: { enabled: cmd === 'enable' } });
      return message.reply({ embeds: [embeds.success(`**${account.accountName}** (${account.platform}) ${cmd === 'enable' ? '🟢 enabled' : '🔴 disabled'}.`)] });
    }

    // ── social-test <id> ──────────────────────────────────────────────────────────
    if (cmd === 'test') {
      const id = args[0];
      if (!id) return message.reply({ embeds: [embeds.error('Usage: `!social-test <id>`')] });
      const account = await prisma.socialAccount.findFirst({ where: { guildId, OR: [{ id }, { id: { endsWith: id } }] } });
      if (!account) return message.reply({ embeds: [embeds.error('Account not found.')] });

      await message.reply({ embeds: [embeds.info('Sending test notification...')] });
      try {
        await sendTestNotification(client, account);
        await message.channel.send({ embeds: [embeds.success('Test notification sent!')] });
      } catch (err) {
        await message.channel.send({ embeds: [embeds.error(`Test failed: ${err.message}`)] });
      }
      return;
    }

    // ── social-check-now ──────────────────────────────────────────────────────────
    if (cmd === 'checknow') {
      await message.reply({ embeds: [embeds.info('Checking all social accounts now...')] });
      try {
        await checkAllAccounts(client);
        await message.channel.send({ embeds: [embeds.success('Social check complete!')] });
      } catch (err) {
        await message.channel.send({ embeds: [embeds.error(`Check failed: ${err.message}`)] });
      }
      return;
    }

    // ── social-logs ───────────────────────────────────────────────────────────────
    if (cmd === 'logs') {
      const logs = await prisma.socialNotificationLog.findMany({
        where: { guildId },
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: { account: true },
      });

      if (!logs.length) return message.reply({ embeds: [embeds.info('No notification logs yet.')] });

      const embed = new EmbedBuilder()
        .setColor(0x1A1A2E)
        .setTitle('📋 Social Notification Logs')
        .setFooter(FOOTER)
        .setTimestamp();

      for (const log of logs) {
        const icon   = PLATFORM_ICONS[log.platform] ?? '📡';
        const status = log.status === 'success' ? '✅' : '❌';
        const time   = log.createdAt ? `<t:${Math.floor(new Date(log.createdAt).getTime() / 1000)}:R>` : '';
        embed.addFields({
          name:  `${status} ${icon} ${log.account?.accountName ?? log.platform} — ${time}`,
          value: log.url ? `[Post](${log.url})` + (log.errorMessage ? `\nError: ${log.errorMessage}` : '') : (log.errorMessage || 'No details'),
          inline: false,
        });
      }
      return message.reply({ embeds: [embed] });
    }

    // ── set-social-banner <platform> <url> ────────────────────────────────────────
    if (cmd === 'setsocialbanner' || cmdName === 'set-social-banner') {
      const platform = args[0]?.toLowerCase();
      const url      = args[1];
      if (!VALID_PLATFORMS.includes(platform) || !url) return message.reply({ embeds: [embeds.error('Usage: `!set-social-banner <platform> <url>`')] });
      const key = `${platform}BannerUrl`;
      await prisma.socialNotifierSettings.upsert({ where: { guildId }, create: { guildId, [key]: url }, update: { [key]: url } });
      return message.reply({ embeds: [embeds.success(`**${platform}** notification banner updated.`)] });
    }

    // ── set-social-thumbnail <platform> <url> ─────────────────────────────────────
    if (cmd === 'setsocialthumbnail' || cmdName === 'set-social-thumbnail') {
      const platform = args[0]?.toLowerCase();
      const url      = args[1];
      if (!VALID_PLATFORMS.includes(platform) || !url) return message.reply({ embeds: [embeds.error('Usage: `!set-social-thumbnail <platform> <url>`')] });
      const key = `${platform}ThumbnailUrl`;
      await prisma.socialNotifierSettings.upsert({ where: { guildId }, create: { guildId, [key]: url }, update: { [key]: url } });
      return message.reply({ embeds: [embeds.success(`**${platform}** notification thumbnail updated.`)] });
    }

    // ── social-reactions <platform> <emoji1> [emoji2] [emoji3] ───────────────────
    if (cmd === 'reactions') {
      const platform = args[0]?.toLowerCase();
      if (!VALID_PLATFORMS.includes(platform)) return message.reply({ embeds: [embeds.error(`Valid platforms: \`${VALID_PLATFORMS.join('`, `')}\``)] });
      const reactionEmojis = args.slice(1, 4);
      if (!reactionEmojis.length) return message.reply({ embeds: [embeds.error('Usage: `!social-reactions <platform> <emoji1> [emoji2] [emoji3]`')] });

      const settings = await getSettings(guildId);
      let reactionsObj;
      try { reactionsObj = JSON.parse(settings.reactionsJson ?? '{}'); } catch { reactionsObj = {}; }
      reactionsObj[platform] = reactionEmojis;

      await prisma.socialNotifierSettings.upsert({
        where:  { guildId },
        create: { guildId, reactionsJson: JSON.stringify(reactionsObj) },
        update: { reactionsJson: JSON.stringify(reactionsObj) },
      });
      return message.reply({ embeds: [embeds.success(`Reactions for **${platform}** set to: ${reactionEmojis.join(' ')}`)] });
    }

    // ── social-set-token (X Bearer token) ─────────────────────────────────────────
    if (cmd === 'settoken') {
      const token = args[0];
      if (!token) return message.reply({ embeds: [embeds.error('Usage: `!social-set-token <x_bearer_token>`\n\nThis stores your X/Twitter API Bearer Token securely for this server.')] });
      await prisma.socialNotifierSettings.upsert({
        where:  { guildId },
        create: { guildId, xBearerToken: token },
        update: { xBearerToken: token },
      });
      await message.delete().catch(() => {}); // Delete message to avoid token exposure
      return message.channel.send({ embeds: [embeds.success('X API Bearer Token saved. The message containing the token has been deleted for security.')] });
    }

    return message.reply({ embeds: [embeds.error('Unknown social command. Use `!social-list` to see all options.')] });
  },
};
