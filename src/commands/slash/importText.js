const { SlashCommandBuilder } = require('discord.js');
const { checkAdminInteraction } = require('../../utils/adminCheck');
const { importFromText } = require('../../services/ruleImportService');
const auditLog = require('../../services/auditLogService');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('import-text')
    .setDescription('Import manual text into the knowledge base (Admin only)')
    .addStringOption(opt =>
      opt.setName('title')
         .setDescription('Title / name for this rule entry')
         .setRequired(true)
         .setMaxLength(200)
    )
    .addStringOption(opt =>
      opt.setName('content')
         .setDescription('The rule text or FAQ content to import')
         .setRequired(true)
         .setMaxLength(4000)
    ),
  deferred: true,
  adminOnly: true,

  async execute(interaction) {
    if (!await checkAdminInteraction(interaction)) return;

    const title   = interaction.options.getString('title');
    const content = interaction.options.getString('content');

    if (content.length < 20) {
      return interaction.editReply({ embeds: [embeds.error('Content must be at least 20 characters.')] });
    }

    try {
      const { source, chunksCreated, skipped } = await importFromText(content, title, interaction.user.id);

      await auditLog.log({
        guildId: interaction.guild.id, adminId: interaction.user.id,
        action: 'IMPORT_TEXT', target: title,
        details: `Source ID: ${source.id}, Chunks: ${chunksCreated}`,
      });

      if (skipped) {
        return interaction.editReply({ embeds: [embeds.info(`Content already imported.\n**Source ID:** \`${source.id}\``)] });
      }

      await interaction.editReply({
        embeds: [embeds.success(`Imported **${title}**\n**ID:** \`${source.id}\`\n**Chunks:** ${chunksCreated}`, 'Text Imported')],
      });
    } catch (err) {
      await interaction.editReply({ embeds: [embeds.error(`Import failed: ${err.message}`)] });
    }
  },
};
