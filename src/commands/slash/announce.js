const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkAdminInteraction } = require('../../utils/adminCheck');
const auditLog = require('../../services/auditLogService');
const embeds = require('../../utils/embeds');
const { COLORS, FOOTER, truncate } = require('../../utils/embeds');
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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Announcement builder — create, preview, send and schedule announcements')
    .addSubcommand(sub => sub
      .setName('create')
      .setDescription('Create a new announcement draft')
      .addStringOption(o => o.setName('title').setDescription('Announcement title').setRequired(true))
      .addStringOption(o => o.setName('description').setDescription('Announcement body text').setRequired(true))
      .addStringOption(o => o.setName('type').setDescription('Announcement type')
        .addChoices(...ANNOUNCEMENT_TYPES.map(t => ({ name: t, value: t }))))
      .addChannelOption(o => o.setName('channel').setDescription('Target channel to send to'))
      .addRoleOption(o => o.setName('role').setDescription('Role to ping when sent'))
      .addStringOption(o => o.setName('banner').setDescription('Banner image URL'))
      .addStringOption(o => o.setName('thumbnail').setDescription('Thumbnail image URL'))
      .addStringOption(o => o.setName('button_label').setDescription('CTA button label'))
      .addStringOption(o => o.setName('button_url').setDescription('CTA button URL'))
    )
    .addSubcommand(sub => sub
      .setName('preview')
      .setDescription('Preview an announcement draft')
      .addStringOption(o => o.setName('id').setDescription('Announcement ID').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('send')
      .setDescription('Send an announcement to its target channel')
      .addStringOption(o => o.setName('id').setDescription('Announcement ID').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('schedule')
      .setDescription('Schedule an announcement for a future date/time')
      .addStringOption(o => o.setName('id').setDescription('Announcement ID').setRequired(true))
      .addStringOption(o => o.setName('time').setDescription('ISO 8601 datetime e.g. 2025-06-15T14:00:00Z').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('List announcements')
      .addStringOption(o => o.setName('status').setDescription('Filter by status')
        .addChoices(
          { name: 'Draft', value: 'draft' },
          { name: 'Scheduled', value: 'scheduled' },
          { name: 'Sent', value: 'sent' },
          { name: 'Cancelled', value: 'cancelled' },
        ))
    )
    .addSubcommand(sub => sub
      .setName('cancel')
      .setDescription('Cancel a draft or scheduled announcement')
      .addStringOption(o => o.setName('id').setDescription('Announcement ID').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('delete')
      .setDescription('Permanently delete an announcement draft')
      .addStringOption(o => o.setName('id').setDescription('Announcement ID').setRequired(true))
    ),

  deferred: true,
  adminOnly: true,

  async execute(interaction) {
    if (!await checkAdminInteraction(interaction)) return;
    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'list') {
      const status = interaction.options.getString('status');
      const list = await listAnnouncements(guildId, status);
      if (!list.length) {
        return interaction.editReply({ embeds: [embeds.info(status ? `No ${status} announcements.` : 'No announcements found.')] });
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
      return interaction.editReply({ embeds: [embed] });
    }

    if (sub === 'create') {
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');
      const type = interaction.options.getString('type') || 'General News';
      const channel = interaction.options.getChannel('channel');
      const role = interaction.options.getRole('role');
      const banner = interaction.options.getString('banner');
      const thumbnail = interaction.options.getString('thumbnail');
      const buttonLabel = interaction.options.getString('button_label');
      const buttonUrl = interaction.options.getString('button_url');

      const ann = await createDraft(guildId, {
        title, description, announcementType: type,
        targetChannelId: channel?.id || null,
        pingRoleId: role?.id || null,
        bannerUrl: banner, thumbnailUrl: thumbnail,
        buttonLabel, buttonUrl,
        createdBy: interaction.user.id,
      });

      await auditLog.log({ guildId, adminId: interaction.user.id, action: 'ANNOUNCE_CREATE', target: ann.id, details: title });

      const preview = buildAnnouncementEmbed(ann);
      const components = buildAnnouncementComponents(ann);
      return interaction.editReply({
        content: `✅ Draft created — ID: \`${ann.id}\`\nUse \`/announce send\` or \`/announce schedule\` when ready.`,
        embeds: [preview],
        components,
      });
    }

    if (sub === 'preview') {
      const id = interaction.options.getString('id');
      const ann = await getAnnouncement(id, guildId);
      if (!ann) return interaction.editReply({ embeds: [embeds.error('Announcement not found.')] });
      const preview = buildAnnouncementEmbed(ann);
      const components = buildAnnouncementComponents(ann);
      const target = ann.targetChannelId ? `**Target:** <#${ann.targetChannelId}>` : '**Target:** Not set';
      const ping = ann.pingRoleId ? `  **Ping:** <@&${ann.pingRoleId}>` : '';
      return interaction.editReply({ content: `📋 Preview — ${target}${ping}`, embeds: [preview], components });
    }

    if (sub === 'send') {
      const id = interaction.options.getString('id');
      try {
        await sendAnnouncement(id, guildId, interaction.user.id, interaction.client);
        await auditLog.log({ guildId, adminId: interaction.user.id, action: 'ANNOUNCE_SEND', target: id });
        return interaction.editReply({ embeds: [embeds.success('Announcement sent!')] });
      } catch (err) {
        return interaction.editReply({ embeds: [embeds.error(err.message)] });
      }
    }

    if (sub === 'schedule') {
      const id = interaction.options.getString('id');
      const time = interaction.options.getString('time');
      try {
        await scheduleAnnouncement(id, guildId, time);
        await auditLog.log({ guildId, adminId: interaction.user.id, action: 'ANNOUNCE_SCHEDULE', target: id, details: time });
        return interaction.editReply({ embeds: [embeds.success(`Announcement scheduled for **${time}**.`)] });
      } catch (err) {
        return interaction.editReply({ embeds: [embeds.error(err.message)] });
      }
    }

    if (sub === 'cancel') {
      const id = interaction.options.getString('id');
      try {
        await cancelAnnouncement(id, guildId);
        await auditLog.log({ guildId, adminId: interaction.user.id, action: 'ANNOUNCE_CANCEL', target: id });
        return interaction.editReply({ embeds: [embeds.success('Announcement cancelled.')] });
      } catch (err) {
        return interaction.editReply({ embeds: [embeds.error(err.message)] });
      }
    }

    if (sub === 'delete') {
      const id = interaction.options.getString('id');
      try {
        await deleteAnnouncement(id, guildId);
        await auditLog.log({ guildId, adminId: interaction.user.id, action: 'ANNOUNCE_DELETE', target: id });
        return interaction.editReply({ embeds: [embeds.success('Announcement deleted.')] });
      } catch (err) {
        return interaction.editReply({ embeds: [embeds.error(err.message)] });
      }
    }
  },
};
