const { EmbedBuilder } = require('discord.js');
const { getGuildSettings, updateGuildSettings } = require('../../services/settingsService');
const { createTicket, closeTicket, listTickets, TICKET_CATEGORIES } = require('../../services/ticketService');
const { listUnansweredQuestions, answerUnansweredQuestion, deleteUnansweredQuestion } = require('../../services/unansweredService');
const auditLog = require('../../services/auditLogService');
const embeds = require('../../utils/embeds');
const { COLORS, FOOTER, truncate } = embeds;

const CATALOG_FIELDS = {
  offer: 'offerText',
  coupon: 'couponText',
  pricing: 'pricingText',
  accounts: 'accountsText',
  payouts: 'payoutsText',
};

function normalizeChannelMention(text) {
  return (text || '').replace(/[<@#!>]/g, '').trim();
}

async function sendCatalogResponse(target, guildId, key, isInteraction = false) {
  const settings = await getGuildSettings(guildId);
  const field = CATALOG_FIELDS[key];
  const content = settings[field] || `No ${key} information has been set yet.`;
  const embed = new EmbedBuilder()
    .setColor(COLORS.PURPLE)
    .setTitle(`FundedCobra ${key.charAt(0).toUpperCase() + key.slice(1)}`)
    .setDescription(content)
    .setFooter(FOOTER)
    .setTimestamp();

  if (isInteraction) {
    return target.reply({ embeds: [embed], ephemeral: false });
  }
  return target.reply({ embeds: [embed] });
}

async function handlePrefixCatalog(message, cmdName) {
  return sendCatalogResponse(message, message.guild.id, cmdName, false);
}

async function handleSlashCatalog(interaction) {
  return sendCatalogResponse(interaction, interaction.guild.id, interaction.commandName, true);
}

async function handlePrefixTicket(message, args, cmdName) {
  if (cmdName === 'tickets') {
    const status = (args[0] || 'open').toLowerCase();
    const tickets = await listTickets(message.guild.id, status);
    if (!tickets.length) return message.reply({ embeds: [embeds.info('No open tickets found.')] });

    const embed = new EmbedBuilder()
      .setColor(COLORS.PURPLE)
      .setTitle('Open Tickets')
      .setFooter(FOOTER)
      .setTimestamp();

    for (const ticket of tickets.slice(0, 10)) {
      embed.addFields({
        name: `${ticket.category} · ${ticket.openerUsername}`,
        value: `Channel: <#${ticket.channelId}>\nStatus: ${ticket.status}\nOpened: <t:${Math.floor(new Date(ticket.createdAt).getTime() / 1000)}:R>`,
        inline: false,
      });
    }

    return message.reply({ embeds: [embed] });
  }

  if (cmdName === 'closeticket') {
    const ticket = await closeTicket(message.channel, message.author.id, message.client);
    if (!ticket) return message.reply({ embeds: [embeds.error('This channel is not an open ticket.')] });
    return message.reply({ embeds: [embeds.success('Ticket closed.')] });
  }

  const category = TICKET_CATEGORIES[args[0]] || args[0] || 'General Support';
  const reason = args.slice(TICKET_CATEGORIES[args[0]] ? 1 : 0).join(' ').trim() || null;
  const result = await createTicket({ guild: message.guild, opener: message.author, category, reason });
  return message.reply({ embeds: [embeds.success(result.created ? `Ticket opened: <#${result.channel.id}>` : `You already have an open ticket: <#${result.ticket.channelId}>`)] });
}

async function handleSlashTicket(interaction, mode) {
  if (mode === 'tickets') {
    const status = interaction.options?.getString('status') || 'open';
    const tickets = await listTickets(interaction.guild.id, status);
    if (!tickets.length) return interaction.reply({ embeds: [embeds.info('No open tickets found.')], ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor(COLORS.PURPLE)
      .setTitle('Open Tickets')
      .setFooter(FOOTER)
      .setTimestamp();

    for (const ticket of tickets.slice(0, 10)) {
      embed.addFields({
        name: `${ticket.category} · ${ticket.openerUsername}`,
        value: `Channel: <#${ticket.channelId}>\nStatus: ${ticket.status}`,
        inline: false,
      });
    }

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (mode === 'closeticket') {
    const ticket = await closeTicket(interaction.channel, interaction.user.id, interaction.client);
    if (!ticket) return interaction.reply({ embeds: [embeds.error('This channel is not an open ticket.')], ephemeral: true });
    return interaction.reply({ embeds: [embeds.success('Ticket closed.')], ephemeral: true });
  }

  const category = interaction.options?.getString('category') || 'General Support';
  const reason = interaction.options?.getString('reason') || null;
  const result = await createTicket({ guild: interaction.guild, opener: interaction.user, category, reason });
  return interaction.reply({ embeds: [embeds.success(result.created ? `Ticket opened: <#${result.channel.id}>` : `You already have an open ticket: <#${result.ticket.channelId}>`)], ephemeral: true });
}

async function handlePrefixSettings(message, args, cmdName) {
  const settings = await getGuildSettings(message.guild.id);
  const value = args.join(' ').trim();

  const fieldMap = {
    'set-offer': 'offerText',
    'set-coupon': 'couponText',
    'set-pricing': 'pricingText',
    'set-rules-channel': 'rulesChannelId',
    'set-support-channel': 'supportChannelId',
    'set-pricing-channel': 'pricingChannelId',
    'set-lead-channel': 'leadChannelId',
    'set-ticket-category': 'ticketCategoryId',
    'set-admin-role': 'adminRoleId',
    'set-support-role': 'supportRoleId',
  };

  if (cmdName === 'enable-dm-followup' || cmdName === 'disable-dm-followup') {
    const updated = await updateGuildSettings(message.guild.id, { dmFollowupEnabled: cmdName === 'enable-dm-followup' });
    await auditLog.log({ guildId: message.guild.id, adminId: message.author.id, action: cmdName.toUpperCase() });
    return message.reply({ embeds: [embeds.success(`DM follow-up ${updated.dmFollowupEnabled ? 'enabled' : 'disabled'}.`)] });
  }

  const field = fieldMap[cmdName];
  if (!field) return message.reply({ embeds: [embeds.error('Unknown settings command.')] });

  if (!value) {
    return message.reply({ embeds: [embeds.error(`Provide a value for **${cmdName}**.`)] });
  }

  const normalized = field.endsWith('Id') ? normalizeChannelMention(value) : value;
  await updateGuildSettings(message.guild.id, { [field]: normalized });
  await auditLog.log({ guildId: message.guild.id, adminId: message.author.id, action: cmdName.toUpperCase(), details: normalized.slice(0, 200) });
  return message.reply({ embeds: [embeds.success(`Updated ${cmdName}.`)] });
}

async function handlePrefixUnanswered(message, args, cmdName) {
  if (cmdName === 'unanswered') {
    const items = await listUnansweredQuestions(message.guild.id, 10);
    if (!items.length) return message.reply({ embeds: [embeds.info('No unanswered questions are waiting.')] });

    const embed = new EmbedBuilder()
      .setColor(COLORS.ORANGE)
      .setTitle('Unanswered Questions')
      .setFooter(FOOTER)
      .setTimestamp();

    for (const item of items) {
      embed.addFields({
        name: `${item.id} · ${item.username || 'Unknown'}`,
        value: truncate(item.question, 900),
        inline: false,
      });
    }

    return message.reply({ embeds: [embed] });
  }

  if (cmdName === 'delete-unanswered') {
    const id = args[0];
    if (!id) return message.reply({ embeds: [embeds.error('Provide an unanswered question ID.')] });
    await deleteUnansweredQuestion(id);
    await auditLog.log({ guildId: message.guild.id, adminId: message.author.id, action: 'DELETE_UNANSWERED', target: id });
    return message.reply({ embeds: [embeds.success(`Deleted unanswered question **${id}**.`)] });
  }

  if (cmdName === 'answer-unanswered') {
    const id = args[0];
    const officialAnswer = args.slice(1).join(' ').trim();
    if (!id || !officialAnswer) return message.reply({ embeds: [embeds.error('Usage: `!answer-unanswered <id> <official answer>`')] });

    const updated = await answerUnansweredQuestion({ id, officialAnswer, adminId: message.author.id });
    if (!updated) return message.reply({ embeds: [embeds.error(`No unanswered question found for **${id}**.`)] });

    await auditLog.log({ guildId: message.guild.id, adminId: message.author.id, action: 'ANSWER_UNANSWERED', target: id, details: officialAnswer.slice(0, 200) });
    return message.reply({ embeds: [embeds.success(`Published an approved FAQ for **${id}** and added it to the knowledge base.`)] });
  }

  return message.reply({ embeds: [embeds.error('Unknown unanswered command.')] });
}

module.exports = {
  handlePrefixCatalog,
  handleSlashCatalog,
  handlePrefixTicket,
  handleSlashTicket,
  handlePrefixSettings,
  handlePrefixUnanswered,
};
