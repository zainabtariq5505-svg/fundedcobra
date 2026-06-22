const embeds = require('../../utils/embeds');
const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { COLORS, FOOTER } = embeds;
const { createTicket, closeTicket, findTicketByChannelId, claimTicket, unclaimTicket, toggleAI, getTicketSettings } = require('../../services/ticketService');
const { generateManualTranscript } = require('../../services/transcriptService');
const { isSupport, isAdmin } = require('../../config/permissions');
const prisma = require('../../database/prisma');
const { processTicketQuestion } = require('../../services/ticketAiService');

module.exports = {
  name: 'ticket-system',
  aliases: [
    'ticket-panel', 'claim', 'unclaim', 'ticket-ai-on', 'ticket-ai-off', 
    'ticket-status', 'ticket-transcript', 'set-ticket-category', 'set-ticket-log', 
    'set-ticket-transcript-channel', 'set-support-role', 'set-ticket-ai-mode', 'ai-suggest'
  ],

  async execute(message, args, client, cmdName) {
    const tSettings = await getTicketSettings(message.guild.id);
    const gSettings = await prisma.guildSettings.findUnique({ where: { guildId: message.guild.id } }).catch(() => null);
    const hasAdmin = isAdmin(message.member, gSettings?.adminRoleId);
    const hasSupport = hasAdmin || isSupport(message.member, tSettings.supportRoleId);

    if (cmdName === 'ticket-panel') {
      if (!hasAdmin) return message.reply({ embeds: [embeds.error('Admin only.')] });
      
      const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle('FundedCobra Support Center')
        .setDescription('Need help? Open a ticket below and our AI assistant will help you immediately while our support team reviews your inquiry.')
        .setThumbnail('https://www.fundedcobra.com/logo.png')
        .setImage('https://www.fundedcobra.com/banner.png')
        .setFooter(FOOTER);

      const row = new ActionRowBuilder()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('ticket:panel:select')
            .setPlaceholder('Select a category to open a ticket...')
            .addOptions([
              { label: 'General Support', value: 'General Support', emoji: '❔' },
              { label: 'Rules Question', value: 'Rules Question', emoji: '📜' },
              { label: 'Payout Issue', value: 'Payout Issue', emoji: '💸' },
              { label: 'Payment Issue', value: 'Payment Issue', emoji: '💳' },
              { label: 'Account Issue', value: 'Account Issue', emoji: '👤' },
              { label: 'Refund Request', value: 'Refund Request', emoji: '↩️' },
              { label: 'Partnership / Affiliate', value: 'Partnership / Affiliate', emoji: '🤝' },
              { label: 'Giveaway Support', value: 'Giveaway Support', emoji: '🎉' },
              { label: 'Other', value: 'Other', emoji: '❓' },
            ])
        );

      await message.channel.send({ embeds: [embed], components: [row] });
      return message.delete().catch(() => {});
    }

    if (cmdName === 'claim') {
      if (!hasSupport) return message.reply({ embeds: [embeds.error('Permission denied.')] });
      const ticket = await findTicketByChannelId(message.channel.id);
      if (!ticket) return message.reply({ embeds: [embeds.error('This channel is not an open ticket.')] });
      if (ticket.status === 'claimed') return message.reply({ embeds: [embeds.error('Ticket is already claimed.')] });
      
      await claimTicket(message.channel, message.author.id, message.author.username);
      
      const claimEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('Ticket Claimed')
        .setDescription(`**${message.author.username}** has claimed this ticket. AI assistance is now paused, and a real FundedCobra support member will continue from here.`)
        .addFields(
          { name: 'Claimed by', value: `<@${message.author.id}>`, inline: true },
          { name: 'AI Status', value: 'Disabled', inline: true },
          { name: 'Ticket ID', value: ticket.id.slice(-8), inline: true },
          { name: 'Claimed at', value: new Date().toLocaleString(), inline: true }
        )
        .setFooter(FOOTER)
        .setTimestamp();
        
      return message.channel.send({ embeds: [claimEmbed] });
    }

    if (cmdName === 'unclaim') {
      if (!hasSupport) return message.reply({ embeds: [embeds.error('Permission denied.')] });
      const ticket = await findTicketByChannelId(message.channel.id);
      if (!ticket) return message.reply({ embeds: [embeds.error('This channel is not an open ticket.')] });
      if (ticket.status !== 'claimed') return message.reply({ embeds: [embeds.error('Ticket is not claimed.')] });
      
      const updated = await unclaimTicket(message.channel, message.author.id, message.author.username);
      
      const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('Ticket Unclaimed')
        .setDescription(`**${message.author.username}** has unclaimed this ticket.`)
        .addFields({ name: 'AI Status', value: updated.aiEnabled ? 'Enabled' : 'Disabled', inline: true })
        .setFooter(FOOTER)
        .setTimestamp();
        
      return message.channel.send({ embeds: [embed] });
    }

    if (cmdName === 'ticket-ai-on') {
      if (!hasSupport) return message.reply({ embeds: [embeds.error('Permission denied.')] });
      const ticket = await findTicketByChannelId(message.channel.id);
      if (!ticket) return message.reply({ embeds: [embeds.error('This channel is not an open ticket.')] });
      
      await toggleAI(message.channel, true);
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('AI Assistant Enabled')
        .setDescription('AI will now assist in this ticket until a staff member claims it or disables AI.')
        .setFooter(FOOTER);
      return message.channel.send({ embeds: [embed] });
    }

    if (cmdName === 'ticket-ai-off') {
      if (!hasSupport) return message.reply({ embeds: [embeds.error('Permission denied.')] });
      const ticket = await findTicketByChannelId(message.channel.id);
      if (!ticket) return message.reply({ embeds: [embeds.error('This channel is not an open ticket.')] });
      
      await toggleAI(message.channel, false);
      const embed = new EmbedBuilder()
        .setColor(0x808080)
        .setTitle('AI Assistant Disabled')
        .setDescription('AI will no longer respond automatically in this ticket.')
        .setFooter(FOOTER);
      return message.channel.send({ embeds: [embed] });
    }

    if (cmdName === 'ticket-status') {
      const ticket = await findTicketByChannelId(message.channel.id);
      if (!ticket) return message.reply({ embeds: [embeds.error('This channel is not a ticket.')] });

      const messageCount = await prisma.ticketMessage.count({ where: { ticketId: ticket.id } });
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Ticket Status')
        .addFields(
          { name: 'Ticket ID', value: ticket.id.slice(-8), inline: true },
          { name: 'User', value: `<@${ticket.openerId}>`, inline: true },
          { name: 'Category', value: ticket.category, inline: true },
          { name: 'Status', value: ticket.status, inline: true },
          { name: 'AI Status', value: ticket.aiEnabled ? 'Active' : 'Disabled', inline: true },
          { name: 'Claimed by', value: ticket.claimedById ? `<@${ticket.claimedById}>` : 'Unclaimed', inline: true },
          { name: 'Created at', value: ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : 'Unknown', inline: true },
          { name: 'Message count', value: String(messageCount), inline: true }
        )
        .setFooter(FOOTER)
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    if (cmdName === 'ticket-transcript') {
      if (!hasSupport) return message.reply({ embeds: [embeds.error('Permission denied.')] });
      const ticket = await findTicketByChannelId(message.channel.id);
      if (!ticket) return message.reply({ embeds: [embeds.error('This channel is not a ticket.')] });

      const loading = await message.reply('Generating transcript...');
      const record = await generateManualTranscript(message.channel, ticket, message.author.id, client);
      if (record && record.txtFilePath) {
        const attachment = new AttachmentBuilder(record.txtFilePath);
        return loading.edit({ content: 'Transcript generated.', files: [attachment] }).catch(() => {});
      }
      return loading.edit('Failed to generate transcript.');
    }
    
    if (cmdName === 'ai-suggest') {
      if (!hasSupport) return message.reply({ embeds: [embeds.error('Permission denied.')] });
      const ticket = await findTicketByChannelId(message.channel.id);
      if (!ticket) return message.reply({ embeds: [embeds.error('Must be used in a ticket channel.')] });
      
      const question = args.join(' ');
      if (!question) return message.reply({ embeds: [embeds.error('Please provide a question.')] });
      
      const loading = await message.reply('Generating suggestion...');
      try {
        const aiResult = await processTicketQuestion({
          question,
          guildId: message.guild.id,
          channelId: message.channel.id,
          userId: message.author.id,
          username: message.author.username,
          displayName: message.author.username,
        });
        
        if (aiResult && aiResult.answer) {
          const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🤖 Staff AI Suggestion')
            .setDescription(aiResult.answer)
            .setFooter(FOOTER);
          return loading.edit({ content: null, embeds: [embed] });
        }
      } catch (e) {
         return loading.edit('Failed to generate suggestion.');
      }
    }
    
    // Setting commands
    if (['set-ticket-category', 'set-ticket-log', 'set-ticket-transcript-channel', 'set-support-role'].includes(cmdName)) {
      if (!hasAdmin) return message.reply({ embeds: [embeds.error('Admin only.')] });
      const value = args[0]?.replace(/[<@#!&>]/g, '').trim();
      if (!value) return message.reply({ embeds: [embeds.error('Please provide a valid ID.')] });
      
      const fieldMap = {
        'set-ticket-category': 'ticketCategoryId',
        'set-ticket-log': 'ticketLogChannelId',
        'set-ticket-transcript-channel': 'transcriptChannelId',
        'set-support-role': 'supportRoleId',
      };
      
      await prisma.ticketSettings.upsert({
        where: { guildId: message.guild.id },
        update: { [fieldMap[cmdName]]: value },
        create: {
          guildId: message.guild.id,
          [fieldMap[cmdName]]: value
        }
      });
      return message.reply({ embeds: [embeds.success(`Successfully updated ${cmdName}.`)] });
    }
    
    if (cmdName === 'set-ticket-ai-mode') {
      if (!hasAdmin) return message.reply({ embeds: [embeds.error('Admin only.')] });
      const mode = args[0]?.toLowerCase();
      if (mode !== 'on' && mode !== 'off') return message.reply({ embeds: [embeds.error('Please specify "on" or "off".')] });
      
      await prisma.ticketSettings.upsert({
        where: { guildId: message.guild.id },
        update: { aiEnabledByDefault: mode === 'on' },
        create: {
          guildId: message.guild.id,
          aiEnabledByDefault: mode === 'on'
        }
      });
      return message.reply({ embeds: [embeds.success(`Ticket AI mode set to ${mode}.`)] });
    }
  },
};
