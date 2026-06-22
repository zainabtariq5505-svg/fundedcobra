const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkAdminInteraction } = require('../../utils/adminCheck');
const { getLeads } = require('../../services/leadService');
const { COLORS, FOOTER, truncate } = require('../../utils/embeds');
const { timeAgo } = require('../../utils/formatDate');
const embeds = require('../../utils/embeds');

const STATUS_EMOJI = { hot: '🔥', warm: '🟡', new: '🆕', closed: '✅', ignored: '⚫' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leads')
    .setDescription('View leads (Admin only)')
    .addStringOption(opt =>
      opt.setName('status')
         .setDescription('Filter by status')
         .addChoices(
           { name: '🔥 Hot',     value: 'hot'     },
           { name: '🟡 Warm',    value: 'warm'    },
           { name: '🆕 New',     value: 'new'     },
           { name: '✅ Closed',  value: 'closed'  },
           { name: '⚫ Ignored', value: 'ignored' },
         )
    ),
  deferred: true,
  adminOnly: true,

  async execute(interaction) {
    if (!await checkAdminInteraction(interaction)) return;

    const statusFilter = interaction.options.getString('status');
    const leads = await getLeads(interaction.guild.id, { status: statusFilter, limit: 20 });

    if (leads.length === 0) {
      return interaction.editReply({
        embeds: [embeds.info(statusFilter ? `No ${statusFilter} leads found.` : 'No leads found yet.')],
      });
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.PURPLE)
      .setTitle(`${statusFilter ? `${STATUS_EMOJI[statusFilter]} ${statusFilter.toUpperCase()} Leads` : 'All Leads'} (${leads.length})`)
      .setFooter(FOOTER)
      .setTimestamp();

    for (const lead of leads) {
      embed.addFields({
        name: `${STATUS_EMOJI[lead.status] || '❓'} ${lead.username} (Score: ${lead.score})`,
        value: [
          `ID: \`${lead.userId}\` · **${lead.status}** · ${timeAgo(lead.updatedAt)}`,
          lead.lastQuestion ? truncate(lead.lastQuestion, 80) : '',
        ].filter(Boolean).join('\n'),
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
