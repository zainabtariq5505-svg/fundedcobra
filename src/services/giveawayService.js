const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const prisma = require('../database/prisma');
const logger = require('../utils/logger');
const { COLORS, FOOTER } = require('../utils/embeds');

async function createGiveaway(guildId, data) {
  const endAt = new Date(data.endAt);
  if (isNaN(endAt.getTime())) throw new Error('Invalid end time.');
  if (endAt <= new Date()) throw new Error('End time must be in the future.');

  return prisma.giveaway.create({
    data: {
      guildId,
      createdBy: data.createdBy,
      prize: data.prize,
      description: data.description || null,
      winnerCount: Number(data.winnerCount) || 1,
      status: 'pending',
      requiredRoleId: data.requiredRoleId || null,
      bonusRoleId: data.bonusRoleId || null,
      bannerUrl: data.bannerUrl || null,
      thumbnailUrl: data.thumbnailUrl || null,
      endAt,
    },
  });
}

async function startGiveaway(id, guildId, channel) {
  const giveaway = await getGiveaway(id, guildId);
  if (!giveaway) throw new Error('Giveaway not found.');
  if (giveaway.status !== 'pending') throw new Error(`Giveaway is already **${giveaway.status}**.`);

  const embed = buildGiveawayEmbed(giveaway, 0);
  const row = buildGiveawayButton(id);
  const message = await channel.send({ embeds: [embed], components: [row] });

  return prisma.giveaway.update({
    where: { id },
    data: { status: 'active', channelId: channel.id, messageId: message.id, startAt: new Date() },
  });
}

async function getGiveaway(id, guildId) {
  return prisma.giveaway.findFirst({ where: { id, guildId } });
}

async function listGiveaways(guildId, status = null) {
  return prisma.giveaway.findMany({
    where: { guildId, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}

async function enterGiveaway(giveawayId, userId, username, guildId, member) {
  const giveaway = await prisma.giveaway.findUnique({ where: { id: giveawayId } }).catch(() => null);
  if (!giveaway) return { success: false, reason: 'Giveaway not found.' };
  if (giveaway.status !== 'active') return { success: false, reason: 'This giveaway is no longer active.' };
  if (new Date() > new Date(giveaway.endAt)) return { success: false, reason: 'This giveaway has ended.' };

  if (giveaway.requiredRoleId && member) {
    if (!member.roles?.cache?.has(giveaway.requiredRoleId)) {
      return { success: false, reason: `You need the <@&${giveaway.requiredRoleId}> role to enter this giveaway.` };
    }
  }

  const existing = await prisma.giveawayEntry.findUnique({
    where: { giveawayId_userId: { giveawayId, userId } },
  }).catch(() => null);
  if (existing) return { success: false, reason: 'You have already entered this giveaway.' };

  let entriesCount = 1;
  if (giveaway.bonusRoleId && member?.roles?.cache?.has(giveaway.bonusRoleId)) {
    entriesCount += 1;
  }

  await prisma.giveawayEntry.create({
    data: { giveawayId, guildId, userId, username, entriesCount },
  });

  return { success: true, entriesCount };
}

async function endGiveaway(id, guildId, client) {
  const giveaway = await getGiveaway(id, guildId);
  if (!giveaway) throw new Error('Giveaway not found.');
  if (giveaway.status === 'cancelled') throw new Error('Giveaway was cancelled.');
  if (giveaway.status === 'ended') throw new Error('Giveaway already ended.');

  await prisma.giveaway.update({ where: { id }, data: { status: 'ended' } });

  const entries = await prisma.giveawayEntry.findMany({ where: { giveawayId: id } });
  const winners = pickWinners(entries, giveaway.winnerCount);

  if (winners.length > 0) {
    await prisma.giveawayWinner.createMany({
      data: winners.map(w => ({
        giveawayId: id, guildId, userId: w.userId, username: w.username, rerollNumber: 0,
      })),
    });
  }

  await updateGiveawayMessage(giveaway, { ...giveaway, status: 'ended' }, entries.length, winners, client);

  if (giveaway.channelId) {
    try {
      const ch = await client.channels.fetch(giveaway.channelId);
      if (!ch) return { giveaway, winners };
      if (winners.length === 0) {
        await ch.send({
          embeds: [new EmbedBuilder()
            .setColor(COLORS.ORANGE)
            .setTitle('🎁 Giveaway Ended — No Winners')
            .setDescription(`**${giveaway.prize}**\n\nNo valid entries were found.`)
            .setFooter(FOOTER).setTimestamp()],
        });
      } else {
        const mentions = winners.map(w => `<@${w.userId}>`).join(', ');
        await ch.send({
          embeds: [new EmbedBuilder()
            .setColor(COLORS.GOLD)
            .setTitle('🎉 Giveaway Winners!')
            .setDescription(`**${giveaway.prize}**\n\n🏆 ${mentions}\n\nCongratulations!`)
            .setFooter(FOOTER).setTimestamp()],
        });
      }
    } catch (err) {
      logger.warn(`Could not announce giveaway winners for ${id}: ${err.message}`);
    }
  }

  return { giveaway, winners };
}

async function rerollGiveaway(id, guildId, client) {
  const giveaway = await getGiveaway(id, guildId);
  if (!giveaway) throw new Error('Giveaway not found.');
  if (giveaway.status !== 'ended') throw new Error('Giveaway has not ended yet.');

  const entries = await prisma.giveawayEntry.findMany({ where: { giveawayId: id } });
  const prevWinners = await prisma.giveawayWinner.findMany({ where: { giveawayId: id } });
  const prevIds = new Set(prevWinners.map(w => w.userId));
  const eligible = entries.filter(e => !prevIds.has(e.userId));

  if (eligible.length === 0) throw new Error('No eligible entries remaining for a reroll.');

  const rerollNumber = Math.max(0, ...prevWinners.map(w => w.rerollNumber)) + 1;
  const pool = eligible.flatMap(e => Array(e.entriesCount).fill(e));
  const winner = pool[Math.floor(Math.random() * pool.length)];

  await prisma.giveawayWinner.create({
    data: { giveawayId: id, guildId, userId: winner.userId, username: winner.username, rerollNumber },
  });

  if (giveaway.channelId) {
    try {
      const ch = await client.channels.fetch(giveaway.channelId);
      if (ch) {
        await ch.send({
          embeds: [new EmbedBuilder()
            .setColor(COLORS.PURPLE)
            .setTitle('🔁 Giveaway Rerolled!')
            .setDescription(`**${giveaway.prize}**\n\nNew winner: <@${winner.userId}>\n\nCongratulations!`)
            .setFooter(FOOTER).setTimestamp()],
        });
      }
    } catch (err) {
      logger.warn(`Could not send reroll announcement for ${id}: ${err.message}`);
    }
  }

  return winner;
}

async function cancelGiveaway(id, guildId, client) {
  const giveaway = await getGiveaway(id, guildId);
  if (!giveaway) throw new Error('Giveaway not found.');
  if (giveaway.status === 'ended') throw new Error('Giveaway has already ended.');
  if (giveaway.status === 'cancelled') throw new Error('Giveaway is already cancelled.');

  await prisma.giveaway.update({ where: { id }, data: { status: 'cancelled' } });
  await updateGiveawayMessage(giveaway, { ...giveaway, status: 'cancelled' }, 0, [], client);
  return giveaway;
}

async function getEntries(id, guildId) {
  const giveaway = await getGiveaway(id, guildId);
  if (!giveaway) throw new Error('Giveaway not found.');
  return prisma.giveawayEntry.findMany({ where: { giveawayId: id }, orderBy: { enteredAt: 'asc' } });
}

function pickWinners(entries, count) {
  if (!entries.length) return [];
  const pool = entries.flatMap(e => Array(e.entriesCount).fill(e));
  const shuffled = pool.sort(() => Math.random() - 0.5);
  const seen = new Set();
  const winners = [];
  for (const entry of shuffled) {
    if (!seen.has(entry.userId)) {
      seen.add(entry.userId);
      winners.push(entry);
    }
    if (winners.length >= count) break;
  }
  return winners;
}

async function updateGiveawayMessage(original, updated, entryCount, winners, client) {
  if (!original.channelId || !original.messageId) return;
  try {
    const ch = await client.channels.fetch(original.channelId);
    if (!ch) return;
    const msg = await ch.messages.fetch(original.messageId);
    if (!msg) return;
    const embed = buildGiveawayEmbed(updated, entryCount, winners);
    await msg.edit({ embeds: [embed], components: [] });
  } catch (err) {
    logger.warn(`Could not update giveaway message ${original.messageId}: ${err.message}`);
  }
}

function buildGiveawayEmbed(giveaway, entryCount, winners = []) {
  const statusColors = { active: COLORS.GREEN, ended: COLORS.GOLD, cancelled: COLORS.RED, pending: COLORS.GREY };
  const statusEmoji = { active: '🟢', ended: '🏁', cancelled: '❌', pending: '⏳' };
  const endTs = Math.floor(new Date(giveaway.endAt).getTime() / 1000);

  const embed = new EmbedBuilder()
    .setColor(statusColors[giveaway.status] || COLORS.PRIMARY)
    .setTitle(`🎁 ${giveaway.prize}`)
    .setFooter(FOOTER)
    .setTimestamp();

  if (giveaway.description) embed.setDescription(giveaway.description);

  embed.addFields(
    { name: '🏆 Winners', value: String(giveaway.winnerCount), inline: true },
    { name: '📊 Status', value: `${statusEmoji[giveaway.status] || '❓'} ${giveaway.status.charAt(0).toUpperCase() + giveaway.status.slice(1)}`, inline: true },
    { name: '👥 Entries', value: String(entryCount), inline: true },
    { name: '⏰ Ends', value: giveaway.status === 'active' ? `<t:${endTs}:R>` : `<t:${endTs}:f>`, inline: true },
  );

  if (giveaway.requiredRoleId) {
    embed.addFields({ name: '🔒 Required Role', value: `<@&${giveaway.requiredRoleId}>`, inline: true });
  }
  if (giveaway.bonusRoleId) {
    embed.addFields({ name: '⭐ Bonus Role', value: `<@&${giveaway.bonusRoleId}> (+1 entry)`, inline: true });
  }
  if (winners.length > 0) {
    embed.addFields({ name: '🏆 Winners', value: winners.map(w => `<@${w.userId}>`).join(', '), inline: false });
  }

  if (giveaway.bannerUrl) embed.setImage(giveaway.bannerUrl);
  if (giveaway.thumbnailUrl) embed.setThumbnail(giveaway.thumbnailUrl);

  return embed;
}

function buildGiveawayButton(giveawayId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`giveaway:enter:${giveawayId}`)
      .setLabel('🎉 Enter Giveaway')
      .setStyle(ButtonStyle.Primary)
  );
}

async function processEndedGiveaways(client) {
  const due = await prisma.giveaway.findMany({
    where: { status: 'active', endAt: { lte: new Date() } },
  }).catch(() => []);

  for (const giveaway of due) {
    try {
      await endGiveaway(giveaway.id, giveaway.guildId, client);
    } catch (err) {
      logger.error(`Scheduler: failed to end giveaway ${giveaway.id}: ${err.message}`);
    }
  }
}

module.exports = {
  createGiveaway,
  startGiveaway,
  getGiveaway,
  listGiveaways,
  enterGiveaway,
  endGiveaway,
  rerollGiveaway,
  cancelGiveaway,
  getEntries,
  buildGiveawayEmbed,
  buildGiveawayButton,
  processEndedGiveaways,
};
