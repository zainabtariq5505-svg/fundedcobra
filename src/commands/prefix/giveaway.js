const { EmbedBuilder } = require('discord.js');
const { checkAdminMessage } = require('../../utils/adminCheck');
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
  name: 'giveaway-create',
  aliases: [
    'giveaway-start', 'giveaway-end', 'giveaway-reroll',
    'giveaway-list', 'giveaway-info', 'giveaway-cancel', 'giveaway-entries',
  ],
  description: 'Giveaway management commands',
  usage: [
    '!giveaway-create "<prize>" <duration> [winners] — Create a giveaway (duration: 1h, 2d, etc.)',
    '!giveaway-start <id> [#channel] — Start a pending giveaway',
    '!giveaway-end <id> — Manually end an active giveaway',
    '!giveaway-reroll <id> — Reroll a new winner',
    '!giveaway-list [active|ended|pending|cancelled] — List giveaways',
    '!giveaway-info <id> — Show giveaway details',
    '!giveaway-cancel <id> — Cancel a giveaway',
    '!giveaway-entries <id> — List all entries',
  ].join('\n'),
  adminOnly: true,

  async execute(message, args, client, cmdName) {
    if (!await checkAdminMessage(message)) return;
    const guildId = message.guild.id;

    // !giveaway-list [status]
    if (cmdName === 'giveaway-list' || cmdName === 'giveawaylist') {
      const status = args[0] || null;
      const list = await listGiveaways(guildId, status);
      if (!list.length) {
        return message.reply({ embeds: [embeds.info(status ? `No ${status} giveaways.` : 'No giveaways found.')] });
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
      return message.reply({ embeds: [embed] });
    }

    // !giveaway-info <id>
    if (cmdName === 'giveaway-info' || cmdName === 'giveawayinfo') {
      const id = args[0];
      if (!id) return message.reply({ embeds: [embeds.error('Usage: `!giveaway-info <id>`')] });
      const giveaway = await getGiveaway(id, guildId);
      if (!giveaway) return message.reply({ embeds: [embeds.error('Giveaway not found.')] });
      const entryCount = await require('../../services/giveawayService').getEntries(id, guildId).then(e => e.length).catch(() => 0);
      return message.reply({ embeds: [buildGiveawayEmbed(giveaway, entryCount)] });
    }

    // !giveaway-entries <id>
    if (cmdName === 'giveaway-entries' || cmdName === 'giveawayentries') {
      const id = args[0];
      if (!id) return message.reply({ embeds: [embeds.error('Usage: `!giveaway-entries <id>`')] });
      try {
        const entries = await getEntries(id, guildId);
        if (!entries.length) return message.reply({ embeds: [embeds.info('No entries yet.')] });
        const embed = new EmbedBuilder()
          .setColor(COLORS.PURPLE)
          .setTitle(`👥 Giveaway Entries (${entries.length})`)
          .setDescription(entries.slice(0, 20).map((e, i) => `${i + 1}. ${e.username} — ${e.entriesCount} entr${e.entriesCount === 1 ? 'y' : 'ies'}`).join('\n'))
          .setFooter(FOOTER)
          .setTimestamp();
        if (entries.length > 20) embed.setDescription(embed.data.description + `\n... and ${entries.length - 20} more.`);
        return message.reply({ embeds: [embed] });
      } catch (err) {
        return message.reply({ embeds: [embeds.error(err.message)] });
      }
    }

    // !giveaway-end <id>
    if (cmdName === 'giveaway-end' || cmdName === 'giveawayend') {
      const id = args[0];
      if (!id) return message.reply({ embeds: [embeds.error('Usage: `!giveaway-end <id>`')] });
      try {
        const { winners } = await endGiveaway(id, guildId, client);
        await auditLog.log({ guildId, adminId: message.author.id, action: 'GIVEAWAY_END', target: id });
        const winnerText = winners.length ? winners.map(w => `<@${w.userId}>`).join(', ') : 'No winners (no entries).';
        return message.reply({ embeds: [embeds.success(`Giveaway ended. Winners: ${winnerText}`)] });
      } catch (err) {
        return message.reply({ embeds: [embeds.error(err.message)] });
      }
    }

    // !giveaway-reroll <id>
    if (cmdName === 'giveaway-reroll' || cmdName === 'giveawayreroll') {
      const id = args[0];
      if (!id) return message.reply({ embeds: [embeds.error('Usage: `!giveaway-reroll <id>`')] });
      try {
        const winner = await rerollGiveaway(id, guildId, client);
        await auditLog.log({ guildId, adminId: message.author.id, action: 'GIVEAWAY_REROLL', target: id });
        return message.reply({ embeds: [embeds.success(`Rerolled! New winner: <@${winner.userId}>`)] });
      } catch (err) {
        return message.reply({ embeds: [embeds.error(err.message)] });
      }
    }

    // !giveaway-cancel <id>
    if (cmdName === 'giveaway-cancel' || cmdName === 'giveawaycancel') {
      const id = args[0];
      if (!id) return message.reply({ embeds: [embeds.error('Usage: `!giveaway-cancel <id>`')] });
      try {
        await cancelGiveaway(id, guildId, client);
        await auditLog.log({ guildId, adminId: message.author.id, action: 'GIVEAWAY_CANCEL', target: id });
        return message.reply({ embeds: [embeds.success('Giveaway cancelled.')] });
      } catch (err) {
        return message.reply({ embeds: [embeds.error(err.message)] });
      }
    }

    // !giveaway-start <id> [#channel]
    if (cmdName === 'giveaway-start' || cmdName === 'giveawaystart') {
      const id = args[0];
      if (!id) return message.reply({ embeds: [embeds.error('Usage: `!giveaway-start <id> [#channel]`')] });
      const targetChannel = message.mentions.channels.first() || message.channel;
      try {
        await startGiveaway(id, guildId, targetChannel);
        await auditLog.log({ guildId, adminId: message.author.id, action: 'GIVEAWAY_START', target: id });
        return message.reply({ embeds: [embeds.success(`Giveaway started in ${targetChannel}.`)] });
      } catch (err) {
        return message.reply({ embeds: [embeds.error(err.message)] });
      }
    }

    // !giveaway-create "<prize>" <duration> [winners]
    // Duration format: 1h, 2d, 30m, 1w
    const raw = message.content.slice(message.content.indexOf('giveaway-create') + 'giveaway-create'.length).trim()
      || message.content.slice(message.content.indexOf('giveawaycreate') + 'giveawaycreate'.length).trim();

    const quoted = [...raw.matchAll(/"([^"]+)"/g)].map(m => m[1]);
    if (!quoted.length) {
      return message.reply({
        embeds: [embeds.error(
          'Usage: `!giveaway-create "<prize>" <duration> [winners]`\n\n' +
          'Duration examples: `1h` `2d` `30m` `1w`\n\n' +
          'Example:\n`!giveaway-create "5x $10K Funded Accounts" 2d 5`'
        )],
      });
    }

    const prize = quoted[0];
    const remaining = raw.replace(/"[^"]+"/g, '').trim().split(/\s+/);
    const durationStr = remaining[0];
    const winnerCount = parseInt(remaining[1]) || 1;

    const endAt = parseDuration(durationStr);
    if (!endAt) {
      return message.reply({ embeds: [embeds.error('Invalid duration. Use formats like `1h`, `30m`, `2d`, `1w`.')] });
    }

    try {
      const giveaway = await createGiveaway(guildId, {
        prize, winnerCount, endAt, createdBy: message.author.id,
      });
      await auditLog.log({ guildId, adminId: message.author.id, action: 'GIVEAWAY_CREATE', target: giveaway.id, details: prize });
      return message.reply({
        embeds: [embeds.success(
          `Giveaway created — ID: \`${giveaway.id}\`\n\n` +
          `**Prize:** ${prize}\n` +
          `**Winners:** ${winnerCount}\n` +
          `**Ends:** <t:${Math.floor(endAt.getTime() / 1000)}:R>\n\n` +
          `Start it with: \`!giveaway-start ${giveaway.id} #channel\``
        )],
      });
    } catch (err) {
      return message.reply({ embeds: [embeds.error(err.message)] });
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
