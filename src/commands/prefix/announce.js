const { checkAdminMessage } = require('../../utils/adminCheck');
const auditLog = require('../../services/auditLogService');
const embeds = require('../../utils/embeds');
const {
  ANNOUNCEMENT_TYPES,
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
} = require('../../services/announcementService');
const { EmbedBuilder } = require('discord.js');
const { COLORS, FOOTER, truncate } = require('../../utils/embeds');

module.exports = {
  name: 'announce',
  aliases: [
    'announce-preview', 'announce-send', 'announce-list',
    'announce-delete', 'announce-schedule', 'announce-cancel',
    'announce-channel', 'announce-role', 'announce-banner',
    'announce-thumbnail', 'announce-button',
  ],
  description: 'Announcement builder — create, preview, send, and schedule announcements',
  usage: [
    '!announce "<title>" "<description>" [type] — Create a draft',
    '!announce-list [draft|scheduled|sent] — List announcements',
    '!announce-preview <id> — Preview an announcement',
    '!announce-send <id> — Send a draft to its target channel',
    '!announce-schedule <id> <ISO-datetime> — Schedule for later',
    '!announce-cancel <id> — Cancel a scheduled/draft announcement',
    '!announce-delete <id> — Permanently delete a draft',
    '!announce-channel <id> <#channel> — Set target channel',
    '!announce-role <id> <@role> — Set ping role',
    '!announce-banner <id> <url> — Set banner image',
    '!announce-thumbnail <id> <url> — Set thumbnail',
    '!announce-button <id> <label> <url> — Set CTA button',
  ].join('\n'),
  adminOnly: true,

  async execute(message, args, client, cmdName) {
    if (!await checkAdminMessage(message)) return;
    const guildId = message.guild.id;

    // !announce-list [status]
    if (cmdName === 'announce-list' || cmdName === 'announcelist') {
      const status = args[0] || null;
      const list = await listAnnouncements(guildId, status);
      if (!list.length) {
        return message.reply({ embeds: [embeds.info(status ? `No ${status} announcements.` : 'No announcements found.')] });
      }
      const embed = new EmbedBuilder()
        .setColor(COLORS.GOLD)
        .setTitle('📣 Announcements')
        .setFooter(FOOTER)
        .setTimestamp();
      for (const ann of list.slice(0, 10)) {
        const ts = Math.floor(new Date(ann.createdAt).getTime() / 1000);
        embed.addFields({
          name: `[${ann.status.toUpperCase()}] ${truncate(ann.title, 50)}`,
          value: `ID: \`${ann.id}\` · Type: ${ann.announcementType} · <t:${ts}:R>`,
          inline: false,
        });
      }
      return message.reply({ embeds: [embed] });
    }

    // !announce-preview <id>
    if (cmdName === 'announce-preview' || cmdName === 'announcepreview') {
      const id = args[0];
      if (!id) return message.reply({ embeds: [embeds.error('Usage: `!announce-preview <id>`')] });
      const ann = await getAnnouncement(id, guildId);
      if (!ann) return message.reply({ embeds: [embeds.error('Announcement not found.')] });
      const embed = buildAnnouncementEmbed(ann);
      const components = buildAnnouncementComponents(ann);
      const target = ann.targetChannelId ? `**Target:** <#${ann.targetChannelId}>` : '**Target:** Not set';
      const ping = ann.pingRoleId ? `**Ping:** <@&${ann.pingRoleId}>` : '';
      return message.reply({ content: `📋 Preview — ${target}${ping ? '\n' + ping : ''}`, embeds: [embed], components });
    }

    // !announce-send <id>
    if (cmdName === 'announce-send' || cmdName === 'announcesend') {
      const id = args[0];
      if (!id) return message.reply({ embeds: [embeds.error('Usage: `!announce-send <id>`')] });
      try {
        await sendAnnouncement(id, guildId, message.author.id, client);
        await auditLog.log({ guildId, adminId: message.author.id, action: 'ANNOUNCE_SEND', target: id });
        return message.reply({ embeds: [embeds.success('Announcement sent!')] });
      } catch (err) {
        return message.reply({ embeds: [embeds.error(err.message)] });
      }
    }

    // !announce-schedule <id> <datetime>
    if (cmdName === 'announce-schedule' || cmdName === 'announceschedule') {
      const [id, ...rest] = args;
      const datetime = rest.join(' ');
      if (!id || !datetime) {
        return message.reply({ embeds: [embeds.error('Usage: `!announce-schedule <id> <ISO-datetime>`\nExample: `!announce-schedule abc123 2025-06-15T14:00:00Z`')] });
      }
      try {
        await scheduleAnnouncement(id, guildId, datetime);
        await auditLog.log({ guildId, adminId: message.author.id, action: 'ANNOUNCE_SCHEDULE', target: id, details: datetime });
        return message.reply({ embeds: [embeds.success(`Announcement scheduled for **${datetime}**.`)] });
      } catch (err) {
        return message.reply({ embeds: [embeds.error(err.message)] });
      }
    }

    // !announce-cancel <id>
    if (cmdName === 'announce-cancel' || cmdName === 'announcecancel') {
      const id = args[0];
      if (!id) return message.reply({ embeds: [embeds.error('Usage: `!announce-cancel <id>`')] });
      try {
        await cancelAnnouncement(id, guildId);
        await auditLog.log({ guildId, adminId: message.author.id, action: 'ANNOUNCE_CANCEL', target: id });
        return message.reply({ embeds: [embeds.success('Announcement cancelled.')] });
      } catch (err) {
        return message.reply({ embeds: [embeds.error(err.message)] });
      }
    }

    // !announce-delete <id>
    if (cmdName === 'announce-delete' || cmdName === 'announcedelete') {
      const id = args[0];
      if (!id) return message.reply({ embeds: [embeds.error('Usage: `!announce-delete <id>`')] });
      try {
        await deleteAnnouncement(id, guildId);
        await auditLog.log({ guildId, adminId: message.author.id, action: 'ANNOUNCE_DELETE', target: id });
        return message.reply({ embeds: [embeds.success('Announcement deleted.')] });
      } catch (err) {
        return message.reply({ embeds: [embeds.error(err.message)] });
      }
    }

    // !announce-channel <id> <#channel>
    if (cmdName === 'announce-channel' || cmdName === 'announcechannel') {
      const id = args[0];
      const channelId = message.mentions.channels.first()?.id || args[1];
      if (!id || !channelId) {
        return message.reply({ embeds: [embeds.error('Usage: `!announce-channel <id> <#channel>`')] });
      }
      try {
        await updateAnnouncementField(id, guildId, 'targetChannelId', channelId);
        return message.reply({ embeds: [embeds.success(`Target channel set to <#${channelId}>.`)] });
      } catch (err) {
        return message.reply({ embeds: [embeds.error(err.message)] });
      }
    }

    // !announce-role <id> <@role>
    if (cmdName === 'announce-role' || cmdName === 'announcerole') {
      const id = args[0];
      const roleId = message.mentions.roles.first()?.id || args[1]?.replace(/[<@&>]/g, '');
      if (!id || !roleId) {
        return message.reply({ embeds: [embeds.error('Usage: `!announce-role <id> <@role>`')] });
      }
      try {
        await updateAnnouncementField(id, guildId, 'pingRoleId', roleId);
        return message.reply({ embeds: [embeds.success(`Ping role set to <@&${roleId}>.`)] });
      } catch (err) {
        return message.reply({ embeds: [embeds.error(err.message)] });
      }
    }

    // !announce-banner <id> <url>
    if (cmdName === 'announce-banner' || cmdName === 'announcebanner') {
      const [id, url] = args;
      if (!id || !url) return message.reply({ embeds: [embeds.error('Usage: `!announce-banner <id> <url>`')] });
      try {
        new URL(url);
        await updateAnnouncementField(id, guildId, 'bannerUrl', url);
        return message.reply({ embeds: [embeds.success('Banner URL updated.')] });
      } catch (err) {
        return message.reply({ embeds: [embeds.error(err.message === 'Invalid URL' ? 'Invalid URL provided.' : err.message)] });
      }
    }

    // !announce-thumbnail <id> <url>
    if (cmdName === 'announce-thumbnail' || cmdName === 'announcethumbnail') {
      const [id, url] = args;
      if (!id || !url) return message.reply({ embeds: [embeds.error('Usage: `!announce-thumbnail <id> <url>`')] });
      try {
        new URL(url);
        await updateAnnouncementField(id, guildId, 'thumbnailUrl', url);
        return message.reply({ embeds: [embeds.success('Thumbnail URL updated.')] });
      } catch (err) {
        return message.reply({ embeds: [embeds.error(err.message === 'Invalid URL' ? 'Invalid URL provided.' : err.message)] });
      }
    }

    // !announce-button <id> <label> <url>
    if (cmdName === 'announce-button' || cmdName === 'announcebutton') {
      const id = args[0];
      const url = args[args.length - 1];
      const label = args.slice(1, -1).join(' ');
      if (!id || !label || !url) {
        return message.reply({ embeds: [embeds.error('Usage: `!announce-button <id> <label> <url>`')] });
      }
      try {
        new URL(url);
        await updateAnnouncementField(id, guildId, 'buttonLabel', label);
        await updateAnnouncementField(id, guildId, 'buttonUrl', url);
        return message.reply({ embeds: [embeds.success(`Button set: **${label}** → ${url}`)] });
      } catch (err) {
        return message.reply({ embeds: [embeds.error(err.message === 'Invalid URL' ? 'Invalid URL provided.' : err.message)] });
      }
    }

    // !announce "<title>" "<description>" [type]
    // Parse quoted strings: !announce "My Title" "My Description" Giveaway
    const raw = message.content.slice(message.content.indexOf('announce') + 'announce'.length).trim();
    const quoted = [...raw.matchAll(/"([^"]+)"/g)].map(m => m[1]);
    if (quoted.length < 2) {
      return message.reply({
        embeds: [embeds.error(
          'Usage: `!announce "<title>" "<description>" [type]`\n\n' +
          `**Types:** ${ANNOUNCEMENT_TYPES.join(', ')}\n\n` +
          'Example:\n`!announce "5x $10K Giveaway" "Join now to win a funded account!" Giveaway`'
        )],
      });
    }

    const [title, description] = quoted;
    const typeArg = raw.replace(/"[^"]+"/g, '').trim();
    const announcementType = ANNOUNCEMENT_TYPES.find(t => t.toLowerCase() === typeArg.toLowerCase()) || 'General News';

    const ann = await createDraft(guildId, {
      title, description, announcementType, createdBy: message.author.id,
    });

    await auditLog.log({ guildId, adminId: message.author.id, action: 'ANNOUNCE_CREATE', target: ann.id, details: title });

    const previewEmbed = buildAnnouncementEmbed(ann);
    return message.reply({
      content: [
        `✅ Draft created — ID: \`${ann.id}\``,
        `**Next steps:**`,
        `• Set channel: \`!announce-channel ${ann.id} #channel\``,
        `• Preview: \`!announce-preview ${ann.id}\``,
        `• Send now: \`!announce-send ${ann.id}\``,
        `• Schedule: \`!announce-schedule ${ann.id} 2025-06-15T14:00:00Z\``,
      ].join('\n'),
      embeds: [previewEmbed],
    });
  },
};
