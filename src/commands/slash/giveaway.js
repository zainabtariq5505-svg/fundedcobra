const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkAdminInteraction } = require('../../utils/adminCheck');
const auditLog = require('../../services/auditLogService');
const embeds = require('../../utils/embeds');
const { COLORS, FOOTER, truncate } = require('../../utils/embeds');
const {
  createGiveaway,
  startGiveaway,
  getGiveaway,
  listGiveaways,
  endGiveaway,
  rerollGiveaway,
  cancelGiveaway,
  getEntries,
  buildGiveawayEmbed,
} = require('../../services/giveawayService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Giveaway management')
    .addSubcommand(sub => sub
      .setName('create')
      .setDescription('Create a new giveaway')
      .addStringOption(o => o.setName('prize').setDescription('Prize name e.g. "5x $10K Funded Accounts"').setRequired(true))
      .addStringOption(o => o.setName('duration').setDescription('Duration e.g. 1h, 2d, 30m, 1w').setRequired(true))
      .addIntegerOption(o => o.setName('winners').setDescription('Number of winners (default: 1)').setMinValue(1).setMaxValue(20))
      .addRoleOption(o => o.setName('required_role').setDescription('Role required to enter'))
      .addRoleOption(o => o.setName('bonus_role').setDescription('Role that grants +1 bonus entry'))
      .addStringOption(o => o.setName('description').setDescription('Giveaway description'))
      .addStringOption(o => o.setName('banner').setDescription('Banner image URL'))
      .addStringOption(o => o.setName('thumbnail').setDescription('Thumbnail image URL'))
    )
    .addSubcommand(sub => sub
      .setName('start')
      .setDescription('Start a pending giveaway in a channel')
      .addStringOption(o => o.setName('id').setDescription('Giveaway ID').setRequired(true))
      .addChannelOption(o => o.setName('channel').setDescription('Channel to post in (defaults to current)'))
    )
    .addSubcommand(sub => sub
      .setName('end')
      .setDescription('Manually end an active giveaway')
      .addStringOption(o => o.setName('id').setDescription('Giveaway ID').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('reroll')
      .setDescription('Reroll a new winner for an ended giveaway')
      .addStringOption(o => o.setName('id').setDescription('Giveaway ID').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('cancel')
      .setDescription('Cancel an active or pending giveaway')
      .addStringOption(o => o.setName('id').setDescription('Giveaway ID').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('List giveaways')
      .addStringOption(o => o.setName('status').setDescription('Filter by status')
        .addChoices(
          { name: 'Active', value: 'active' },
          { name: 'Pending', value: 'pending' },
          { name: 'Ended', value: 'ended' },
          { name: 'Cancelled', value: 'cancelled' },
        ))
    )
    .addSubcommand(sub => sub
      .setName('info')
      .setDescription('Show giveaway details')
      .addStringOption(o => o.setName('id').setDescription('Giveaway ID').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('entries')
      .setDescription('List all entries for a giveaway')
      .addStringOption(o => o.setName('id').setDescription('Giveaway ID').setRequired(true))
    ),

  deferred: true,
  adminOnly: true,

  async execute(interaction) {
    if (!await checkAdminInteraction(interaction)) return;
    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'list') {
      const status = interaction.options.getString('status');
      const list = await listGiveaways(guildId, status);
      if (!list.length) {
        return interaction.editReply({ embeds: [embeds.info(status ? `No ${status} giveaways.` : 'No giveaways found.')] });
      }
      const embed = new EmbedBuilder()
        .setColor(COLORS.GOLD)
        .setTitle('🎁 Giveaways')
        .setFooter(FOOTER)
        .setTimestamp();
      for (const g of list.slice(0, 10)) {
        const endTs = Math.floor(new Date(g.endAt).getTime() / 1000);
        embed.addFields({
          name: `[${g.status.toUpperCase()}] ${truncate(g.prize, 50)}`,
          value: `ID: \`${g.id}\` · Winners: ${g.winnerCount} · Ends: <t:${endTs}:f>`,
          inline: false,
        });
      }
      return interaction.editReply({ embeds: [embed] });
    }

    if (sub === 'info') {
      const id = interaction.options.getString('id');
      const giveaway = await getGiveaway(id, guildId);
      if (!giveaway) return interaction.editReply({ embeds: [embeds.error('Giveaway not found.')] });
      const entries = await getEntries(id, guildId).catch(() => []);
      return interaction.editReply({ embeds: [buildGiveawayEmbed(giveaway, entries.length)] });
    }

    if (sub === 'entries') {
      const id = interaction.options.getString('id');
      try {
        const entries = await getEntries(id, guildId);
        if (!entries.length) return interaction.editReply({ embeds: [embeds.info('No entries yet.')] });
        const embed = new EmbedBuilder()
          .setColor(COLORS.PURPLE)
          .setTitle(`👥 Entries (${entries.length})`)
          .setDescription(entries.slice(0, 20).map((e, i) => `${i + 1}. ${e.username} — ${e.entriesCount} entr${e.entriesCount === 1 ? 'y' : 'ies'}`).join('\n'))
          .setFooter(FOOTER)
          .setTimestamp();
        if (entries.length > 20) embed.setDescription(embed.data.description + `\n...and ${entries.length - 20} more.`);
        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        return interaction.editReply({ embeds: [embeds.error(err.message)] });
      }
    }

    if (sub === 'create') {
      const prize = interaction.options.getString('prize');
      const durationStr = interaction.options.getString('duration');
      const winnerCount = interaction.options.getInteger('winners') || 1;
      const requiredRole = interaction.options.getRole('required_role');
      const bonusRole = interaction.options.getRole('bonus_role');
      const description = interaction.options.getString('description');
      const banner = interaction.options.getString('banner');
      const thumbnail = interaction.options.getString('thumbnail');

      const endAt = parseDuration(durationStr);
      if (!endAt) {
        return interaction.editReply({ embeds: [embeds.error('Invalid duration. Use formats like `1h`, `30m`, `2d`, `1w`.')] });
      }

      try {
        const giveaway = await createGiveaway(guildId, {
          prize, winnerCount, endAt, description,
          requiredRoleId: requiredRole?.id || null,
          bonusRoleId: bonusRole?.id || null,
          bannerUrl: banner, thumbnailUrl: thumbnail,
          createdBy: interaction.user.id,
        });
        await auditLog.log({ guildId, adminId: interaction.user.id, action: 'GIVEAWAY_CREATE', target: giveaway.id, details: prize });
        return interaction.editReply({
          embeds: [embeds.success(
            `Giveaway created — ID: \`${giveaway.id}\`\n\n` +
            `**Prize:** ${prize}\n**Winners:** ${winnerCount}\n**Ends:** <t:${Math.floor(endAt.getTime() / 1000)}:R>\n\n` +
            `Start it with: \`/giveaway start id:${giveaway.id}\``
          )],
        });
      } catch (err) {
        return interaction.editReply({ embeds: [embeds.error(err.message)] });
      }
    }

    if (sub === 'start') {
      const id = interaction.options.getString('id');
      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
      try {
        await startGiveaway(id, guildId, targetChannel);
        await auditLog.log({ guildId, adminId: interaction.user.id, action: 'GIVEAWAY_START', target: id });
        return interaction.editReply({ embeds: [embeds.success(`Giveaway started in ${targetChannel}.`)] });
      } catch (err) {
        return interaction.editReply({ embeds: [embeds.error(err.message)] });
      }
    }

    if (sub === 'end') {
      const id = interaction.options.getString('id');
      try {
        const { winners } = await endGiveaway(id, guildId, interaction.client);
        await auditLog.log({ guildId, adminId: interaction.user.id, action: 'GIVEAWAY_END', target: id });
        const winnerText = winners.length ? winners.map(w => `<@${w.userId}>`).join(', ') : 'No winners (no entries).';
        return interaction.editReply({ embeds: [embeds.success(`Giveaway ended. Winners: ${winnerText}`)] });
      } catch (err) {
        return interaction.editReply({ embeds: [embeds.error(err.message)] });
      }
    }

    if (sub === 'reroll') {
      const id = interaction.options.getString('id');
      try {
        const winner = await rerollGiveaway(id, guildId, interaction.client);
        await auditLog.log({ guildId, adminId: interaction.user.id, action: 'GIVEAWAY_REROLL', target: id });
        return interaction.editReply({ embeds: [embeds.success(`Rerolled! New winner: <@${winner.userId}>`)] });
      } catch (err) {
        return interaction.editReply({ embeds: [embeds.error(err.message)] });
      }
    }

    if (sub === 'cancel') {
      const id = interaction.options.getString('id');
      try {
        await cancelGiveaway(id, guildId, interaction.client);
        await auditLog.log({ guildId, adminId: interaction.user.id, action: 'GIVEAWAY_CANCEL', target: id });
        return interaction.editReply({ embeds: [embeds.success('Giveaway cancelled.')] });
      } catch (err) {
        return interaction.editReply({ embeds: [embeds.error(err.message)] });
      }
    }
  },
};

function parseDuration(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)(m|h|d|w)$/i);
  if (!match) return null;
  const n = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const ms = { m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 }[unit];
  return new Date(Date.now() + n * ms);
}
