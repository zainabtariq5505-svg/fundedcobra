const prisma = require('../database/prisma');
const { checkCooldown } = require('../utils/cooldown');
const embeds = require('../utils/embeds');
const logger = require('../utils/logger');
const env = require('../config/env');
const { awardXP } = require('../services/xpService');

module.exports = {
  name: 'messageCreate',
  once: false,

  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    // Fetch guild-specific prefix
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: message.guild.id },
    }).catch(() => null);

    const prefix = settings?.prefix || env.BOT_PREFIX;

    // Check if message is in a ticket
    const { findTicketByChannelId } = require('../services/ticketService');
    const ticket = await findTicketByChannelId(message.channel.id);
    
    // Save message to ticket log if in a ticket
    if (ticket) {
      const { isAdmin, isSupport } = require('../config/permissions');
      const isStaff = isAdmin(message.member, settings?.adminRoleId) || isSupport(message.member, settings?.supportRoleId);
      
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          guildId: message.guild.id,
          channelId: message.channel.id,
          userId: message.author.id,
          username: message.author.username,
          messageContent: message.content,
          isStaff: isStaff,
        }
      }).catch(() => {});
      
      await prisma.ticket.update({ where: { id: ticket.id }, data: { lastActivityAt: new Date() }}).catch(() => {});
    }

    // Process AI assistance in tickets
    if (ticket && ticket.aiEnabled && ticket.status === 'open' && message.author.id === ticket.openerId && !message.content.startsWith(prefix)) {
      const { processTicketQuestion } = require('../services/ticketAiService');
      message.channel.sendTyping().catch(() => {});
      try {
        const aiResponse = await processTicketQuestion({
          question: message.content,
          guildId: message.guild.id,
          channelId: message.channel.id,
          userId: message.author.id,
          username: message.author.username,
          displayName: message.author.username
        });
        
        if (aiResponse && aiResponse.answer) {
          await message.reply(aiResponse.answer);
          await prisma.ticketMessage.create({
            data: {
              ticketId: ticket.id,
              guildId: message.guild.id,
              channelId: message.channel.id,
              userId: client.user.id,
              username: client.user.username,
              messageContent: aiResponse.answer,
              isStaff: false,
              isAI: true
            }
          }).catch(() => {});
          
          const { logTicketEvent } = require('../services/ticketLogService');
          const { EmbedBuilder } = require('discord.js');
          const logEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('AI Assisted User')
            .addFields(
              { name: 'Ticket ID', value: ticket.id.slice(-8), inline: true },
              { name: 'User', value: `<@${message.author.id}>`, inline: true }
            );
          await logTicketEvent(client, message.guild.id, logEmbed);
        }
      } catch (err) {
        logger.error('Error generating AI response in ticket:', err);
      }
      return;
    }

    // Award XP for all non-bot guild messages
    awardXP(message, client).catch(() => {});

    if (!message.content.startsWith(prefix)) return;

    // Parse command and args
    const args    = message.content.slice(prefix.length).trim().split(/\s+/);
    const cmdName = args.shift().toLowerCase();

    // Look up command in registry (supports hyphens and camelCase)
    const command = client.prefixCommands.get(cmdName)
      || client.prefixCommands.get(cmdName.replace(/-/g, ''));

    if (!command) return;

    // Cooldown check (admins are exempt)
    const { isAdmin } = require('../config/permissions');
    const isAdminUser = isAdmin(message.member, settings?.adminRoleId);

    if (!isAdminUser) {
      const cooldownSecs = command.cooldown ?? env.COOLDOWN_SECONDS;
      const { onCooldown, remaining } = checkCooldown(message.author.id, cmdName, cooldownSecs);
      if (onCooldown) {
        return message.reply({
          embeds: [embeds.error(`Please wait **${remaining}s** before using this command again.`)],
        });
      }
    }

    // Execute command
    try {
      await command.execute(message, args, client, cmdName);
    } catch (err) {
      logger.error(`Error executing prefix command "${cmdName}":`, err);
      message.reply({
        embeds: [embeds.error('Something went wrong. Please try again or contact support@fundedcobra.com')],
      }).catch(() => {});
    }
  },
};
