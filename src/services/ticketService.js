const { ChannelType, PermissionsBitField, EmbedBuilder } = require('discord.js');
const prisma = require('../database/prisma');
const { getGuildSettings } = require('./settingsService');
const { buildTicketActionRows } = require('../utils/messageComponents');
const { COLORS, FOOTER } = require('../utils/embeds');
const { applyBehaviorRoles } = require('./supportService');
const { logTicketEvent } = require('./ticketLogService');

async function getTicketSettings(guildId) {
  return prisma.ticketSettings.upsert({
    where: { guildId },
    update: {},
    create: { guildId },
  });
}

const TICKET_CATEGORIES = {
  'Payout Issue': 'Payout Issue',
  'Payment Issue': 'Payment Issue',
  'Rules Question': 'Rules Question',
  'Account Issue': 'Account Issue',
  'Refund Request': 'Refund Request',
  'General Support': 'General Support',
};

function normalizeCategory(category) {
  return TICKET_CATEGORIES[category] || 'General Support';
}

async function createTicket({ guild, opener, category = 'General Support', reason = null }) {
  const existing = await prisma.ticket.findFirst({
    where: { guildId: guild.id, openerId: opener.id, status: 'open' },
  });
  if (existing) {
    // Verify the channel still exists and isn't a closed channel
    const existingChannel = guild.channels.cache.get(existing.channelId)
      || await guild.channels.fetch(existing.channelId).catch(() => null);
    const isStale = !existingChannel || existingChannel.name.startsWith('closed-');
    if (isStale) {
      // Fix the stale DB record and fall through to create a new ticket
      await prisma.ticket.update({ where: { id: existing.id }, data: { status: 'closed', closedAt: new Date() } }).catch(() => {});
    } else {
      return { ticket: existing, created: false };
    }
  }

  const settings = await getGuildSettings(guild.id);
  const ticketSettings = await getTicketSettings(guild.id);
  const safeCategory = normalizeCategory(category);
  const channelName = `ticket-${opener.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 90) || 'ticket';

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel],
    },
    {
      id: opener.id,
      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks],
    },
  ];

  if (ticketSettings.supportRoleId) {
    overwrites.push({
      id: ticketSettings.supportRoleId,
      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
    });
  }

  if (ticketSettings.adminRoleId) {
    overwrites.push({
      id: ticketSettings.adminRoleId,
      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
    });
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: ticketSettings.ticketCategoryId || settings.ticketCategoryId || null,
    permissionOverwrites: overwrites,
    topic: `Ticket opened by ${opener.id} | ${safeCategory}`,
  });

  const ticket = await prisma.ticket.create({
    data: {
      guildId: guild.id,
      channelId: channel.id,
      openerId: opener.id,
      openerUsername: opener.username,
      category: safeCategory,
      aiEnabled: ticketSettings.aiEnabledByDefault,
    },
  });

  await applyBehaviorRoles(guild.client, guild.id, opener.id, ['Ticket Opened']).catch(() => {});

  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setTitle(`Support Ticket: ${safeCategory}`)
    .setDescription([
      `Thanks for reaching out, <@${opener.id}>.`,
      `**Ticket ID:** ${ticket.id.slice(-8)}`,
      `**Category:** ${safeCategory}`,
      `**AI Status:** Active 🤖`,
      '',
      'Our AI assistant will help you immediately while our support team reviews your ticket. Once a staff member claims this ticket, AI assistance will automatically pause.',
      reason ? `\nReason: ${reason}` : null,
    ].filter(Boolean).join('\n'))
    .setFooter(FOOTER)
    .setTimestamp();

  await channel.send({
    content: `<@${opener.id}> ${ticketSettings.supportRoleId ? `<@&${ticketSettings.supportRoleId}>` : ''}`,
    embeds: [embed],
    components: buildTicketActionRows(),
  });

  const logEmbed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setTitle('Ticket Created')
    .addFields(
      { name: 'User', value: `<@${opener.id}>`, inline: true },
      { name: 'Category', value: safeCategory, inline: true },
      { name: 'Ticket ID', value: ticket.id.slice(-8), inline: true }
    );
  await logTicketEvent(guild.client, guild.id, logEmbed);

  return { ticket, channel, created: true };
}

async function closeTicket(channel, closedById = null, client = null) {
  const ticket = await prisma.ticket.findFirst({ where: { channelId: channel.id, status: { not: 'closed' } } });
  if (!ticket) return null;

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: 'closed', closedBy: closedById, closedAt: new Date() },
  });

  await channel.permissionOverwrites.edit(ticket.openerId, { SendMessages: false }).catch(() => {});
  await channel.setName(`closed-${channel.name}`.slice(0, 100)).catch(() => {});

  // Generate transcript async and delete channel afterward
  if (client) {
    await channel.send('Ticket is closing in 5 seconds...').catch(() => {});
    const startTime = Date.now();
    const { generateTranscript } = require('./transcriptService');
    
    generateTranscript(channel, ticket, closedById, client).then(() => {
      const delay = Math.max(0, 5000 - (Date.now() - startTime));
      setTimeout(() => channel.delete().catch(() => {}), delay);
    }).catch(err => {
      require('../utils/logger').error('Transcript generation failed:', err.message);
      const delay = Math.max(0, 5000 - (Date.now() - startTime));
      setTimeout(() => channel.delete().catch(() => {}), delay);
    });
    
    const logEmbed = new EmbedBuilder()
      .setColor(COLORS.RED)
      .setTitle('Ticket Closed')
      .addFields(
        { name: 'Ticket ID', value: ticket.id.slice(-8), inline: true },
        { name: 'Closed By', value: closedById ? `<@${closedById}>` : 'Unknown', inline: true }
      );
    await logTicketEvent(client, channel.guild.id, logEmbed);
  } else {
    setTimeout(() => channel.delete().catch(() => {}), 5000);
  }

  return ticket;
}

async function listTickets(guildId, status = 'open') {
  return prisma.ticket.findMany({
    where: { guildId, status },
    orderBy: { createdAt: 'desc' },
  });
}

async function findTicketByChannelId(channelId) {
  return prisma.ticket.findFirst({ where: { channelId } });
}

async function claimTicket(channel, claimerId, claimerUsername) {
  const ticket = await prisma.ticket.findFirst({ where: { channelId: channel.id, status: 'open' } });
  if (!ticket) return null;

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { 
      status: 'claimed', 
      claimedById: claimerId, 
      claimedByUsername: claimerUsername,
      claimedAt: new Date(),
      aiEnabled: false
    }
  });

  await prisma.ticketClaimLog.create({
    data: {
      ticketId: ticket.id,
      guildId: ticket.guildId,
      claimedById: claimerId,
      claimedByUsername: claimerUsername,
      action: 'claimed'
    }
  });

  const logEmbed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('Ticket Claimed')
    .addFields(
      { name: 'Ticket ID', value: ticket.id.slice(-8), inline: true },
      { name: 'Claimed By', value: `<@${claimerId}>`, inline: true }
    );
  await logTicketEvent(channel.client, channel.guild.id, logEmbed);

  return updated;
}

async function unclaimTicket(channel, unclaimerId, unclaimerUsername) {
  const ticket = await prisma.ticket.findFirst({ where: { channelId: channel.id, status: 'claimed' } });
  if (!ticket) return null;

  const settings = await getTicketSettings(ticket.guildId);

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { 
      status: 'open', 
      claimedById: null, 
      claimedByUsername: null,
      claimedAt: null,
      aiEnabled: settings.reEnableAiOnUnclaim
    }
  });

  await prisma.ticketClaimLog.create({
    data: {
      ticketId: ticket.id,
      guildId: ticket.guildId,
      claimedById: unclaimerId,
      claimedByUsername: unclaimerUsername,
      action: 'unclaimed'
    }
  });

  const logEmbed = new EmbedBuilder()
    .setColor(0xFFA500)
    .setTitle('Ticket Unclaimed')
    .addFields(
      { name: 'Ticket ID', value: ticket.id.slice(-8), inline: true },
      { name: 'Unclaimed By', value: `<@${unclaimerId}>`, inline: true }
    );
  await logTicketEvent(channel.client, channel.guild.id, logEmbed);

  return updated;
}

async function toggleAI(channel, enabled) {
  const ticket = await prisma.ticket.findFirst({ where: { channelId: channel.id } });
  if (!ticket) return null;

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { aiEnabled: enabled }
  });
  
  const logEmbed = new EmbedBuilder()
    .setColor(enabled ? 0x00FF00 : 0x808080)
    .setTitle(`AI Assistant ${enabled ? 'Enabled' : 'Disabled'}`)
    .addFields({ name: 'Ticket ID', value: ticket.id.slice(-8), inline: true });
  await logTicketEvent(channel.client, channel.guild.id, logEmbed);

  return updated;
}

module.exports = {
  TICKET_CATEGORIES,
  getTicketSettings,
  createTicket,
  closeTicket,
  listTickets,
  findTicketByChannelId,
  claimTicket,
  unclaimTicket,
  toggleAI
};
