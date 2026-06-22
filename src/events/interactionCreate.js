const { checkCooldown } = require('../utils/cooldown');
const embeds = require('../utils/embeds');
const logger = require('../utils/logger');
const env = require('../config/env');
const prisma = require('../database/prisma');
const { saveFeedback } = require('../services/feedbackService');
const { createTicket, closeTicket, findTicketByChannelId } = require('../services/ticketService');
const { enterGiveaway } = require('../services/giveawayService');
const { collectStats } = require('../services/dashboardService');
const { buildDashboardEmbeds, buildRefreshButton } = require('../commands/prefix/dashboard');

module.exports = {
  name: 'interactionCreate',
  once: false,

  async execute(interaction, client) {
    if (interaction.isButton()) {
      const [scope, action] = interaction.customId.split(':');

      if (scope === 'feedback') {
        const helpful = action === 'helpful';
        const answerPreview = interaction.message?.embeds?.[0]?.description?.slice(0, 500) || null;
        await saveFeedback({
          guildId: interaction.guildId || 'dm',
          messageId: interaction.message.id,
          channelId: interaction.channelId,
          userId: interaction.user.id,
          username: interaction.user.username,
          helpful,
          note: null,
          question: interaction.message?.embeds?.[0]?.title || null,
          answerPreview,
        }).catch(() => {});
        return interaction.reply({ content: helpful ? 'Thanks for the feedback.' : 'Thanks. I’ll flag this for review.', ephemeral: true }).catch(() => {});
      }

      if (scope === 'ticket' && action === 'open') {
        await interaction.deferReply({ ephemeral: true }).catch(() => {});
        try {
          const result = await createTicket({ guild: interaction.guild, opener: interaction.user, category: 'General Support' });
          if (!result.created) {
            return interaction.editReply({ content: `You already have an open ticket: <#${result.ticket.channelId}>` }).catch(() => {});
          }
          await interaction.editReply({ content: `✅ Ticket opened: <#${result.channel.id}>\n\nA support agent will be with you shortly.` }).catch(() => {});

          // Send AI welcome message in the ticket channel
          try {
            const { processTicketQuestion } = require('../services/ticketAiService');
            const aiResult = await processTicketQuestion({
              question: 'Hello, I just opened a support ticket. Can you give me a brief welcome and let me know what information would be helpful to provide for my issue?',
              guildId: interaction.guild.id,
              channelId: result.channel.id,
              userId: interaction.user.id,
              username: interaction.user.username,
              displayName: interaction.member?.displayName || interaction.user.username,
            }).catch(() => null);

            if (aiResult?.answer) {
              const { EmbedBuilder } = require('discord.js');
              const aiEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('🤖 FundedCobra AI Support')
                .setDescription(aiResult.answer)
                .setFooter({ text: '@fundedcobra · AI Assistant', iconURL: 'https://www.fundedcobra.com/logo.png' })
                .setTimestamp();
              await result.channel.send({ embeds: [aiEmbed] }).catch(() => {});
            }
          } catch {}
        } catch (err) {
          logger.error('Ticket open button error:', err.message);
          await interaction.editReply({ content: '❌ Failed to open ticket. Please try again or use `/ticket`.' }).catch(() => {});
        }
        return;
      }

      if (scope === 'support' && action === 'contact') {
        await interaction.deferReply({ ephemeral: true }).catch(() => {});
        try {
          const result = await createTicket({ guild: interaction.guild, opener: interaction.user, category: 'General Support', reason: 'Requested from AI answer buttons.' });
          await interaction.editReply({ content: result.created ? `Support ticket ready: <#${result.channel.id}>` : `Your open ticket: <#${result.ticket.channelId}>` }).catch(() => {});
        } catch (err) {
          logger.error('Support contact button error:', err.message);
          await interaction.editReply({ content: '❌ Failed to open ticket. Please try again.' }).catch(() => {});
        }
        return;
      }

      if (scope === 'ticket' && action === 'close') {
        const ticket = await findTicketByChannelId(interaction.channelId);
        if (!ticket) {
          return interaction.reply({ content: 'This channel is not an open ticket.', ephemeral: true }).catch(() => {});
        }
        await closeTicket(interaction.channel, interaction.user.id, interaction.client);
        return interaction.reply({ content: 'Ticket closed.', ephemeral: true }).catch(() => {});
      }

      if (scope === 'ticket' && action === 'claim') {
        const ticket = await findTicketByChannelId(interaction.channelId);
        if (!ticket) return interaction.reply({ content: 'This channel is not an open ticket.', ephemeral: true }).catch(() => {});
        if (ticket.status === 'claimed') return interaction.reply({ content: 'Ticket is already claimed.', ephemeral: true }).catch(() => {});
        
        const { getTicketSettings } = require('../services/ticketService');
        const tSettings = await getTicketSettings(interaction.guildId);
        const { isSupport, isAdmin } = require('../config/permissions');
        const gSettings = await prisma.guildSettings.findUnique({ where: { guildId: interaction.guildId } }).catch(() => null);
        
        if (!isAdmin(interaction.member, gSettings?.adminRoleId) && !isSupport(interaction.member, tSettings.supportRoleId)) {
            return interaction.reply({ content: 'You do not have permission to claim tickets.', ephemeral: true }).catch(() => {});
        }

        const { claimTicket } = require('../services/ticketService');
        await claimTicket(interaction.channel, interaction.user.id, interaction.user.username);
        
        const { EmbedBuilder } = require('discord.js');
        const claimEmbed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('Ticket Claimed')
          .setDescription(`**${interaction.user.username}** has claimed this ticket. AI assistance is now paused, and a real FundedCobra support member will continue from here.`)
          .addFields(
            { name: 'Claimed by', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'AI Status', value: 'Disabled', inline: true },
            { name: 'Ticket ID', value: ticket.id.slice(-8), inline: true },
            { name: 'Claimed at', value: new Date().toLocaleString(), inline: true }
          )
          .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' })
          .setTimestamp();
          
        await interaction.channel.send({ embeds: [claimEmbed] }).catch(() => {});
        return interaction.reply({ content: 'Ticket claimed successfully.', ephemeral: true }).catch(() => {});
      }

      if (scope === 'ticket' && action === 'disable_ai') {
        const ticket = await findTicketByChannelId(interaction.channelId);
        if (!ticket) return interaction.reply({ content: 'This channel is not a ticket.', ephemeral: true }).catch(() => {});
        
        const { getTicketSettings, toggleAI } = require('../services/ticketService');
        const tSettings = await getTicketSettings(interaction.guildId);
        const { isSupport, isAdmin } = require('../config/permissions');
        const gSettings = await prisma.guildSettings.findUnique({ where: { guildId: interaction.guildId } }).catch(() => null);
        
        if (!isAdmin(interaction.member, gSettings?.adminRoleId) && !isSupport(interaction.member, tSettings.supportRoleId)) {
            return interaction.reply({ content: 'You do not have permission.', ephemeral: true }).catch(() => {});
        }

        await toggleAI(interaction.channel, false);
        
        const { EmbedBuilder } = require('discord.js');
        const aiEmbed = new EmbedBuilder()
          .setColor(0x808080)
          .setTitle('AI Assistant Disabled')
          .setDescription('AI will no longer respond automatically in this ticket.')
          .setFooter({ text: '@fundedcobra', iconURL: 'https://www.fundedcobra.com/logo.png' });
          
        await interaction.channel.send({ embeds: [aiEmbed] }).catch(() => {});
        return interaction.reply({ content: 'AI disabled.', ephemeral: true }).catch(() => {});
      }

      if (scope === 'ticket' && action === 'transcript') {
        const ticket = await findTicketByChannelId(interaction.channelId);
        if (!ticket) return interaction.reply({ content: 'This channel is not a ticket.', ephemeral: true }).catch(() => {});
        
        const { getTicketSettings } = require('../services/ticketService');
        const tSettings = await getTicketSettings(interaction.guildId);
        const { isSupport, isAdmin } = require('../config/permissions');
        const gSettings = await prisma.guildSettings.findUnique({ where: { guildId: interaction.guildId } }).catch(() => null);
        
        if (!isAdmin(interaction.member, gSettings?.adminRoleId) && !isSupport(interaction.member, tSettings.supportRoleId)) {
            return interaction.reply({ content: 'You do not have permission.', ephemeral: true }).catch(() => {});
        }

        await interaction.deferReply({ ephemeral: true }).catch(() => {});
        const { generateManualTranscript } = require('../services/transcriptService');
        const record = await generateManualTranscript(interaction.channel, ticket, interaction.user.id, interaction.client);
        
        if (record && record.txtFilePath) {
          const { AttachmentBuilder } = require('discord.js');
          const attachment = new AttachmentBuilder(record.txtFilePath);
          return interaction.editReply({ content: 'Transcript generated.', files: [attachment] }).catch(() => {});
        }
        return interaction.editReply({ content: 'Failed to generate transcript.' }).catch(() => {});
      }

      if (scope === 'giveaway' && action === 'enter') {
        const giveawayId = interaction.customId.split(':')[2];
        if (!giveawayId) return interaction.reply({ content: 'Invalid giveaway.', ephemeral: true }).catch(() => {});
        const member = interaction.member;
        const result = await enterGiveaway(
          giveawayId,
          interaction.user.id,
          interaction.user.username,
          interaction.guildId,
          member,
        ).catch(err => ({ success: false, reason: err.message }));

        if (result.success) {
          return interaction.reply({
            content: `🎉 You're in! You have **${result.entriesCount}** entr${result.entriesCount === 1 ? 'y' : 'ies'} in this giveaway. Good luck!`,
            ephemeral: true,
          }).catch(() => {});
        }
        return interaction.reply({ content: `❌ ${result.reason}`, ephemeral: true }).catch(() => {});
      }

        if (scope === 'help' && action === 'ask_ai') {
        return interaction.reply({ content: 'Use `/ask` or `!ask <question>` to ask the AI anything about FundedCobra!', ephemeral: true }).catch(() => {});
      }

      if (scope === 'dashboard' && action === 'refresh') {
        const guildId = interaction.customId.split(':')[2] || interaction.guildId;
        await interaction.deferUpdate().catch(() => {});
        try {
          const stats = await collectStats(guildId, interaction.client);
          const embed = buildDashboardEmbeds(stats);
          const row = buildRefreshButton(guildId);
          await interaction.editReply({ embeds: [embed], components: [row] }).catch(() => {});
        } catch (err) {
          logger.error('Dashboard refresh error:', err.message);
        }
        return;
      }
    }

    if (interaction.isStringSelectMenu()) {
      const [scope, action] = interaction.customId.split(':');

      if (scope === 'help' && action === 'category') {
        try {
          const { CATEGORIES } = require('../config/helpCategories');
          const { isModerator } = require('../services/moderationService');
          const { isAdmin } = require('../config/permissions');
          const prisma = require('../database/prisma');
          const brand = require('../config/brandAssets');
          const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

          const selectedId = interaction.values[0];
          const cat = CATEGORIES.find(c => c.id === selectedId);
          if (!cat) return interaction.reply({ content: 'Category not found.', ephemeral: true }).catch(() => {});

          const guildSettings = interaction.guild ? await prisma.guildSettings.findUnique({ where: { guildId: interaction.guild.id } }).catch(() => null) : null;
          const userIsAdmin = interaction.guild ? isAdmin(interaction.member, guildSettings?.adminRoleId) : false;
          const userIsMod   = interaction.guild ? await isModerator(interaction.member, interaction.guild.id).catch(() => false) : false;
          const roleLevel   = userIsAdmin ? 2 : (userIsMod ? 1 : 0);

          if (cat.roleLevel > roleLevel) {
            return interaction.reply({ content: 'You do not have permission to view this category.', ephemeral: true }).catch(() => {});
          }

          const db = interaction.guild ? await prisma.helpMenuSettings.findUnique({ where: { guildId: interaction.guild.id } }).catch(() => null) : null;
          const thumbnail = db?.thumbnailUrl || brand.HELP_MENU_THUMBNAIL_URL;

          const allCmds = [...(cat.commands ?? []), ...(cat.adminCommands ?? [])];
          const FOOTER  = { text: brand.DEFAULT_FOOTER_TEXT, iconURL: brand.FOOTER_ICON_URL };

          const embed = new EmbedBuilder()
            .setColor(brand.ACCENT_COLOR)
            .setTitle(cat.label)
            .setDescription(cat.description)
            .setFooter(FOOTER)
            .setTimestamp();
          if (thumbnail) embed.setThumbnail(thumbnail);
          for (const cmd of allCmds.slice(0, 20)) {
            embed.addFields({ name: `\`${cmd.name}\``, value: cmd.description + (cmd.example ? `\nExample: \`${cmd.example}\`` : ''), inline: false });
          }
          if (!allCmds.length) embed.setDescription(cat.description + '\n\n*No commands listed.*');

          return interaction.update({ embeds: [embed] }).catch(() => {});
        } catch (err) {
          logger.error('Help menu dropdown error:', err.message);
          return interaction.reply({ content: 'Failed to load category.', ephemeral: true }).catch(() => {});
        }
      }

      if (scope === 'ticket' && action === 'panel') {
        const category = interaction.values[0];
        await interaction.deferReply({ ephemeral: true }).catch(() => {});
        try {
          const result = await createTicket({ guild: interaction.guild, opener: interaction.user, category });
          if (!result.created) {
            return interaction.editReply({ content: `You already have an open ticket: <#${result.ticket.channelId}>` }).catch(() => {});
          }
          await interaction.editReply({ content: `✅ Ticket opened: <#${result.channel.id}>\n\nA support agent will be with you shortly.` }).catch(() => {});

          // Send AI welcome message in the ticket channel
          try {
            const { processTicketQuestion } = require('../services/ticketAiService');
            const aiResult = await processTicketQuestion({
              question: 'Hello, I just opened a support ticket. Can you give me a brief welcome and let me know what information would be helpful to provide for my issue?',
              guildId: interaction.guild.id,
              channelId: result.channel.id,
              userId: interaction.user.id,
              username: interaction.user.username,
              displayName: interaction.member?.displayName || interaction.user.username,
            }).catch(() => null);

            if (aiResult?.answer) {
              const { EmbedBuilder } = require('discord.js');
              const aiEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('🤖 FundedCobra AI Support')
                .setDescription(aiResult.answer)
                .setFooter({ text: '@fundedcobra · AI Assistant', iconURL: 'https://www.fundedcobra.com/logo.png' })
                .setTimestamp();
              await result.channel.send({ embeds: [aiEmbed] }).catch(() => {});
            }
          } catch {}
        } catch (err) {
          logger.error('Ticket panel select error:', err.message);
          await interaction.editReply({ content: '❌ Failed to open ticket. Please try again or use `/ticket`.' }).catch(() => {});
        }
        return;
      }
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.slashCommands.get(interaction.commandName);
    if (!command) return;

    // Fetch guild settings for admin role
    const settings = interaction.guild
      ? await prisma.guildSettings.findUnique({ where: { guildId: interaction.guild.id } }).catch(() => null)
      : null;

    // Cooldown check
    const { isAdmin } = require('../config/permissions');
    const isAdminUser = interaction.guild
      ? isAdmin(interaction.member, settings?.adminRoleId)
      : false;

    if (!isAdminUser) {
      const cooldownSecs = command.cooldown ?? env.COOLDOWN_SECONDS;
      const { onCooldown, remaining } = checkCooldown(
        interaction.user.id, interaction.commandName, cooldownSecs
      );
      if (onCooldown) {
        return interaction.reply({
          embeds: [embeds.error(`Please wait **${remaining}s** before using this command again.`)],
          ephemeral: true,
        });
      }
    }

    // Defer if command is slow (AI commands)
    if (command.deferred) {
      await interaction.deferReply().catch(() => {});
    }

    try {
      await command.execute(interaction, client, interaction.commandName);
    } catch (err) {
      logger.error(`Error executing slash command "/${interaction.commandName}":`, err);
      const errorEmbed = embeds.error('Something went wrong. Please try again or contact support@fundedcobra.com');

      if (interaction.deferred || interaction.replied) {
        interaction.editReply({ embeds: [errorEmbed] }).catch(() => {});
      } else {
        interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
      }
    }
  },
};
