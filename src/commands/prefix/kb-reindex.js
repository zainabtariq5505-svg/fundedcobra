const { checkAdminMessage } = require('../../utils/adminCheck');
const { embedMissingChunks } = require('../../services/embeddingService');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'kb-reindex',
  description: 'Generate embeddings for chunks that are missing them',
  usage: '!kb-reindex',
  adminOnly: true,

  async execute(message) {
    if (!await checkAdminMessage(message)) return;

    const statusMsg = await message.reply({ embeds: [embeds.info('Checking for missing embeddings...')] });

    try {
      const count = await embedMissingChunks();
      if (count === 0) {
        return statusMsg.edit({ embeds: [embeds.success('All chunks already have embeddings.', 'Up to Date')] });
      }
      return statusMsg.edit({ embeds: [embeds.success(`Successfully generated embeddings for **${count}** chunks.`, 'Reindex Complete')] });
    } catch (err) {
      return statusMsg.edit({ embeds: [embeds.error(`Reindexing failed: ${err.message}`)] });
    }
  },
};
