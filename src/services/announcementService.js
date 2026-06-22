const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const prisma = require('../database/prisma');
const logger = require('../utils/logger');
const { COLORS, FOOTER } = require('../utils/embeds');

const ANNOUNCEMENT_TYPES = [
  'Offer', 'Giveaway', 'Payout Proof', 'Rule Update',
  'Maintenance', 'New Feature', 'General News', 'Urgent Alert',
];

const TYPE_COLORS = {
  'Offer':        0xFFD700,
  'Giveaway':     0x00FF88,
  'Payout Proof': 0x7B00FF,
  'Rule Update':  0xFF8C00,
  'Maintenance':  0xFF4444,
  'New Feature':  0x0066FF,
  'General News': 0x1A1A2E,
  'Urgent Alert': 0xFF0000,
};

const TYPE_EMOJI = {
  'Offer':        '💰',
  'Giveaway':     '🎁',
  'Payout Proof': '💸',
  'Rule Update':  '📋',
  'Maintenance':  '🔧',
  'New Feature':  '✨',
  'General News': '📢',
  'Urgent Alert': '🚨',
};

function validateUrl(url) {
  if (!url) return null;
  try { new URL(url); return url; } catch { return null; }
}

async function createDraft(guildId, data) {
  return prisma.announcement.create({
    data: {
      guildId,
      title: data.title,
      description: data.description,
      bannerUrl: validateUrl(data.bannerUrl),
      thumbnailUrl: validateUrl(data.thumbnailUrl),
      buttonLabel: data.buttonLabel || null,
      buttonUrl: validateUrl(data.buttonUrl),
      targetChannelId: data.targetChannelId || null,
      pingRoleId: data.pingRoleId || null,
      announcementType: data.announcementType || 'General News',
      footerText: data.footerText || '@fundedcobra',
      colorTheme: data.colorTheme || 'GOLD',
      status: 'draft',
      createdBy: data.createdBy,
    },
  });
}

async function getAnnouncement(id, guildId) {
  return prisma.announcement.findFirst({ where: { id, guildId } });
}

async function listAnnouncements(guildId, status = null) {
  return prisma.announcement.findMany({
    where: { guildId, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}

async function sendAnnouncement(id, guildId, sentBy, client) {
  const ann = await getAnnouncement(id, guildId);
  if (!ann) throw new Error('Announcement not found.');
  if (ann.status === 'sent') throw new Error('Announcement already sent.');
  if (!ann.targetChannelId) throw new Error('No target channel set. Use `!announce-channel <id> <#channel>`.');

  const channel = await client.channels.fetch(ann.targetChannelId).catch(() => null);
  if (!channel || typeof channel.send !== 'function') {
    throw new Error('Target channel is invalid or the bot cannot access it.');
  }

  const embed = buildAnnouncementEmbed(ann);
  const components = buildAnnouncementComponents(ann);
  const content = ann.pingRoleId ? `<@&${ann.pingRoleId}>` : undefined;

  await channel.send({ content, embeds: [embed], components });

  return prisma.announcement.update({
    where: { id },
    data: { status: 'sent', sentBy, sentAt: new Date() },
  });
}

async function scheduleAnnouncement(id, guildId, scheduledAt) {
  const ann = await getAnnouncement(id, guildId);
  if (!ann) throw new Error('Announcement not found.');
  if (ann.status === 'sent') throw new Error('Announcement already sent.');

  const date = new Date(scheduledAt);
  if (isNaN(date.getTime())) throw new Error('Invalid date/time format. Use ISO 8601 (e.g. 2025-06-15T14:00:00Z).');
  if (date <= new Date()) throw new Error('Scheduled time must be in the future.');

  return prisma.announcement.update({
    where: { id },
    data: { status: 'scheduled', scheduledAt: date },
  });
}

async function cancelAnnouncement(id, guildId) {
  const ann = await getAnnouncement(id, guildId);
  if (!ann) throw new Error('Announcement not found.');
  if (ann.status === 'sent') throw new Error('Cannot cancel a sent announcement.');
  return prisma.announcement.update({ where: { id }, data: { status: 'cancelled' } });
}

async function deleteAnnouncement(id, guildId) {
  const ann = await getAnnouncement(id, guildId);
  if (!ann) throw new Error('Announcement not found.');
  return prisma.announcement.delete({ where: { id } });
}

async function updateAnnouncementField(id, guildId, field, value) {
  const ann = await getAnnouncement(id, guildId);
  if (!ann) throw new Error('Announcement not found.');
  if (ann.status === 'sent') throw new Error('Cannot edit a sent announcement.');
  return prisma.announcement.update({ where: { id }, data: { [field]: value } });
}

function buildAnnouncementEmbed(ann) {
  const color = TYPE_COLORS[ann.announcementType] || COLORS.GOLD;
  const emoji = TYPE_EMOJI[ann.announcementType] || '📢';

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${emoji} ${ann.title}`)
    .setDescription(ann.description)
    .setFooter({ text: ann.footerText || '@fundedcobra', iconURL: FOOTER.iconURL })
    .setTimestamp();

  if (ann.announcementType) {
    embed.addFields({ name: 'Category', value: ann.announcementType, inline: true });
  }

  if (ann.bannerUrl) embed.setImage(ann.bannerUrl);
  if (ann.thumbnailUrl) embed.setThumbnail(ann.thumbnailUrl);

  return embed;
}

function buildAnnouncementComponents(ann) {
  if (!ann.buttonLabel || !validateUrl(ann.buttonUrl)) return [];
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel(ann.buttonLabel.slice(0, 80))
        .setURL(ann.buttonUrl)
    ),
  ];
}

async function processDueAnnouncements(client) {
  const due = await prisma.announcement.findMany({
    where: { status: 'scheduled', scheduledAt: { lte: new Date() } },
  }).catch(() => []);

  for (const ann of due) {
    try {
      await sendAnnouncement(ann.id, ann.guildId, 'scheduler', client);
    } catch (err) {
      logger.error(`Scheduler: failed to send announcement ${ann.id}: ${err.message}`);
      await prisma.announcement.update({
        where: { id: ann.id },
        data: { status: 'draft' },
      }).catch(() => {});
    }
  }
}

module.exports = {
  ANNOUNCEMENT_TYPES,
  TYPE_COLORS,
  TYPE_EMOJI,
  createDraft,
  getAnnouncement,
  listAnnouncements,
  sendAnnouncement,
  scheduleAnnouncement,
  cancelAnnouncement,
  deleteAnnouncement,
  updateAnnouncementField,
  buildAnnouncementEmbed,
  buildAnnouncementComponents,
  processDueAnnouncements,
};
