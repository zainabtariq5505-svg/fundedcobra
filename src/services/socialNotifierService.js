const axios = require('axios');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const prisma = require('../database/prisma');
const logger = require('../utils/logger');
const brand = require('../config/brandAssets');

const PLATFORM_COLORS = {
  youtube:   0xFF0000,
  instagram: 0xE1306C,
  x:         0x000000,
  tiktok:    0x010101,
};

const PLATFORM_ICONS = {
  youtube:   '▶️',
  instagram: '📸',
  x:         '𝕏',
  tiktok:    '🎵',
};

const DEFAULT_TEMPLATES = {
  youtube:   'Hey {ping}, we uploaded a new video on our YouTube channel. Go check it out!',
  instagram: 'Hey {ping}, we posted new content on Instagram. Go check it out!',
  x:         'Hey {ping}, we posted a new update on X. Go check it out!',
  tiktok:    'Hey {ping}, we uploaded a new TikTok. Go check it out!',
};

// ── Settings helpers ───────────────────────────────────────────────────────────

async function getSettings(guildId) {
  return prisma.socialNotifierSettings.upsert({
    where: { guildId },
    create: { guildId },
    update: {},
  });
}

// ── Ping resolver ──────────────────────────────────────────────────────────────

async function resolvePing(guild, settings) {
  if (settings.pingType === 'everyone') return '@everyone';
  if (settings.pingType === 'here') return '@here';
  if (settings.pingType === 'role' && settings.pingRoleId) return `<@&${settings.pingRoleId}>`;
  return null;
}

// ── Template renderer ──────────────────────────────────────────────────────────

function renderTemplate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}

// ── Notification builder ───────────────────────────────────────────────────────

function buildNotificationEmbed(platform, account, post, settings) {
  const color = PLATFORM_COLORS[platform] ?? 0x1A1A2E;
  const icon  = PLATFORM_ICONS[platform]  ?? '📡';

  const bannerKey = `${platform}BannerUrl`;
  const thumbKey  = `${platform}ThumbnailUrl`;
  const bannerUrl = settings[bannerKey] || brand[`SOCIAL_${platform.toUpperCase()}_BANNER_URL`] || null;
  const thumbUrl  = settings[thumbKey]  || post.thumbnailUrl || null;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: `${icon} ${account.accountName}`, url: account.accountUrl || undefined })
    .setTitle(post.title || post.caption?.slice(0, 200) || `New ${platform} post`)
    .setURL(post.url || undefined)
    .setFooter({ text: brand.DEFAULT_FOOTER_TEXT, iconURL: brand.FOOTER_ICON_URL })
    .setTimestamp(post.publishedAt ? new Date(post.publishedAt) : undefined);

  if (bannerUrl)  embed.setImage(bannerUrl);
  if (thumbUrl)   embed.setThumbnail(thumbUrl);
  if (post.caption && post.caption !== post.title) {
    embed.setDescription(post.caption.length > 300 ? post.caption.slice(0, 297) + '...' : post.caption);
  }
  embed.addFields(
    { name: 'Platform', value: `${icon} ${platform.charAt(0).toUpperCase() + platform.slice(1)}`, inline: true },
    { name: 'Published', value: post.publishedAt ? `<t:${Math.floor(new Date(post.publishedAt).getTime() / 1000)}:R>` : 'Just now', inline: true },
  );

  return embed;
}

function buildNotificationButton(platform, url) {
  const labels = { youtube: 'Watch Now', instagram: 'View Post', x: 'View Post', tiktok: 'Watch Now' };
  if (!url) return null;
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel(labels[platform] || 'View')
      .setStyle(ButtonStyle.Link)
      .setURL(url),
  );
}

// ── Post notification ──────────────────────────────────────────────────────────

async function postNotification(client, guildId, account, post) {
  try {
    const settings = await getSettings(guildId);
    if (!settings.notificationChannelId) return;

    const ch = await client.channels.fetch(settings.notificationChannelId).catch(() => null);
    if (!ch?.isTextBased()) {
      logger.warn(`Social notifier: channel ${settings.notificationChannelId} not found or deleted for guild ${guildId}`);
      await prisma.socialNotifierSettings.update({ where: { guildId }, data: { notificationChannelId: null } }).catch(() => {});
      return;
    }

    const guild = ch.guild;
    const ping  = await resolvePing(guild, settings);

    const templateKey = `${account.platform}Template`;
    const tmpl = settings[templateKey] || DEFAULT_TEMPLATES[account.platform] || DEFAULT_TEMPLATES.youtube;
    const content = renderTemplate(tmpl, {
      ping:        ping || '',
      platform:    account.platform,
      accountName: account.accountName,
      title:       post.title || '',
      url:         post.url   || '',
      publishedAt: post.publishedAt ? new Date(post.publishedAt).toLocaleString() : '',
      server:      guild.name,
      brand:       'FundedCobra',
    });

    const embed  = buildNotificationEmbed(account.platform, account, post, settings);
    const button = buildNotificationButton(account.platform, post.url);
    const components = button ? [button] : [];

    const msg = await ch.send({
      content: ping ? content : undefined,
      embeds:  [embed],
      components,
    });

    // Auto-reactions
    try {
      const reactions = JSON.parse(settings.reactionsJson ?? '{}');
      const platformReactions = reactions[account.platform] ?? [];
      for (const emoji of platformReactions.slice(0, 3)) {
        await msg.react(emoji).catch(() => {});
      }
    } catch {}

    // Save post as notified + log
    await prisma.socialPost.update({
      where: { id: post.id },
      data: {
        notified:        true,
        discordChannelId: ch.id,
        discordMessageId: msg.id,
      },
    });

    await prisma.socialNotificationLog.create({
      data: {
        guildId,
        socialAccountId: account.id,
        platform:        account.platform,
        externalPostId:  post.externalPostId,
        url:             post.url,
        status:          'success',
        postedAt:        new Date(),
      },
    });
  } catch (err) {
    logger.error(`postNotification failed for account ${account.id}: ${err.message}`);
    await prisma.socialNotificationLog.create({
      data: {
        guildId,
        socialAccountId: account.id,
        platform:        account.platform,
        externalPostId:  post.externalPostId,
        url:             post.url,
        status:          'error',
        errorMessage:    err.message,
        postedAt:        new Date(),
      },
    }).catch(() => {});
  }
}

// ── YouTube RSS checker ────────────────────────────────────────────────────────

async function checkYouTube(client, account) {
  try {
    const channelId = account.externalAccountId || account.accountHandle;
    if (!channelId) {
      logger.warn(`YouTube account ${account.id} has no channel ID`);
      return;
    }

    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const res = await axios.get(url, { timeout: 10_000 });
    const xml = res.data;

    const entries = [];
    for (const match of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
      const entry  = match[1];
      const videoId  = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
      const title    = entry.match(/<title>([^<]+)<\/title>/)?.[1]?.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
      const link     = entry.match(/<link[^>]+href="([^"]+)"/)?.[1];
      const published= entry.match(/<published>([^<]+)<\/published>/)?.[1];
      const thumb    = entry.match(/<media:thumbnail[^>]+url="([^"]+)"/)?.[1];
      if (videoId) entries.push({ videoId, title, link, published, thumb });
    }

    await prisma.socialAccount.update({ where: { id: account.id }, data: { lastCheckedAt: new Date() } });

    for (const entry of entries) {
      const existing = await prisma.socialPost.findUnique({
        where: { socialAccountId_externalPostId: { socialAccountId: account.id, externalPostId: entry.videoId } },
      });
      if (existing) continue;

      const post = await prisma.socialPost.create({
        data: {
          guildId:         account.guildId,
          socialAccountId: account.id,
          platform:        'youtube',
          externalPostId:  entry.videoId,
          title:           entry.title,
          url:             entry.link || `https://www.youtube.com/watch?v=${entry.videoId}`,
          thumbnailUrl:    entry.thumb,
          publishedAt:     entry.published ? new Date(entry.published) : null,
          notified:        false,
        },
      });

      await postNotification(client, account.guildId, account, post);
    }
  } catch (err) {
    logger.warn(`checkYouTube (${account.id}): ${err.message}`);
  }
}

// ── X / Twitter checker ────────────────────────────────────────────────────────

async function checkX(client, account) {
  try {
    const settings = await getSettings(account.guildId);
    const bearerToken = settings.xBearerToken;
    if (!bearerToken) {
      logger.warn(`X account ${account.id}: no bearer token configured. Run !social-message to set it.`);
      return;
    }

    const handle = account.accountHandle?.replace('@', '');
    if (!handle) return;

    // Resolve user ID if not cached
    let userId = account.externalAccountId;
    if (!userId) {
      const userRes = await axios.get(
        `https://api.twitter.com/2/users/by/username/${handle}`,
        { headers: { Authorization: `Bearer ${bearerToken}` }, timeout: 10_000 },
      );
      userId = userRes.data?.data?.id;
      if (!userId) return;
      await prisma.socialAccount.update({ where: { id: account.id }, data: { externalAccountId: userId } });
    }

    const tweetRes = await axios.get(
      `https://api.twitter.com/2/users/${userId}/tweets?max_results=5&tweet.fields=created_at,text&expansions=attachments.media_keys&media.fields=preview_image_url,url`,
      { headers: { Authorization: `Bearer ${bearerToken}` }, timeout: 10_000 },
    );

    const tweets = tweetRes.data?.data ?? [];
    const media  = tweetRes.data?.includes?.media ?? [];
    const mediaMap = Object.fromEntries(media.map(m => [m.media_key, m]));

    await prisma.socialAccount.update({ where: { id: account.id }, data: { lastCheckedAt: new Date() } });

    for (const tweet of tweets) {
      const existing = await prisma.socialPost.findUnique({
        where: { socialAccountId_externalPostId: { socialAccountId: account.id, externalPostId: tweet.id } },
      });
      if (existing) continue;

      const thumbKey = tweet.attachments?.media_keys?.[0];
      const thumb    = thumbKey ? (mediaMap[thumbKey]?.url || mediaMap[thumbKey]?.preview_image_url) : null;

      const post = await prisma.socialPost.create({
        data: {
          guildId:         account.guildId,
          socialAccountId: account.id,
          platform:        'x',
          externalPostId:  tweet.id,
          caption:         tweet.text,
          url:             `https://x.com/${handle}/status/${tweet.id}`,
          thumbnailUrl:    thumb,
          publishedAt:     tweet.created_at ? new Date(tweet.created_at) : null,
          notified:        false,
        },
      });

      await postNotification(client, account.guildId, account, post);
    }
  } catch (err) {
    if (err.response?.status === 429) {
      logger.warn(`X rate limited for account ${account.id} — backing off`);
    } else {
      logger.warn(`checkX (${account.id}): ${err.message}`);
    }
  }
}

// ── Instagram checker ──────────────────────────────────────────────────────────

async function checkInstagram(client, account) {
  logger.info(`Instagram notifier for ${account.id}: Official API setup required. Use !social-add instagram to configure access token.`);
}

// ── TikTok checker ─────────────────────────────────────────────────────────────

async function checkTikTok(client, account) {
  logger.info(`TikTok notifier for ${account.id}: Official API setup required. Use !social-add tiktok to configure access token.`);
}

// ── Main check dispatcher ──────────────────────────────────────────────────────

async function checkAccount(client, account) {
  if (!account.enabled) return;
  switch (account.platform) {
    case 'youtube':   return checkYouTube(client, account);
    case 'x':         return checkX(client, account);
    case 'instagram': return checkInstagram(client, account);
    case 'tiktok':    return checkTikTok(client, account);
    default: logger.warn(`Unknown social platform: ${account.platform}`);
  }
}

async function checkAllAccounts(client) {
  try {
    const accounts = await prisma.socialAccount.findMany({ where: { enabled: true } });
    for (const account of accounts) {
      await checkAccount(client, account).catch(err =>
        logger.warn(`Social check error (${account.platform}/${account.id}): ${err.message}`)
      );
    }
  } catch (err) {
    logger.error(`checkAllAccounts: ${err.message}`);
  }
}

// ── Test notification ──────────────────────────────────────────────────────────

async function sendTestNotification(client, account) {
  const fakePost = {
    id:             'test',
    externalPostId: 'test',
    title:          `[TEST] ${account.accountName} — Sample Notification`,
    caption:        'This is a test notification. Your notifier is working correctly!',
    url:            account.accountUrl || 'https://fundedcobra.com',
    thumbnailUrl:   null,
    publishedAt:    new Date(),
  };

  const settings = await getSettings(account.guildId);
  if (!settings.notificationChannelId) throw new Error('No notification channel configured. Use !social-channel first.');
  const ch = await client.channels.fetch(settings.notificationChannelId).catch(() => null);
  if (!ch?.isTextBased()) throw new Error('Notification channel not found.');

  const embed  = buildNotificationEmbed(account.platform, account, fakePost, settings);
  const button = buildNotificationButton(account.platform, fakePost.url);

  await ch.send({ embeds: [embed], components: button ? [button] : [] });
}

module.exports = {
  getSettings,
  checkAllAccounts,
  checkAccount,
  sendTestNotification,
  postNotification,
  PLATFORM_ICONS,
  PLATFORM_COLORS,
  DEFAULT_TEMPLATES,
};
