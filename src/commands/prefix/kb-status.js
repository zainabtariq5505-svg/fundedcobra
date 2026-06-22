const prisma = require('../../database/prisma');
const env = require('../../config/env');
const embeds = require('../../utils/embeds');
const { checkAdminMessage } = require('../../utils/adminCheck');

module.exports = {
  name: 'kb-status',
  description: 'Show knowledge base status and statistics',
  usage: '!kb-status',
  adminOnly: true,

  async execute(message) {
    if (!await checkAdminMessage(message)) return;

    await message.channel.sendTyping();

    let dbConnected = true;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbConnected = false;
    }

    const guildId = message.guild.id;
    const sourceCount = await prisma.knowledgeSource.count({ where: { guildId } }).catch(() => 0);
    const chunkCount = await prisma.knowledgeChunk.count({ where: { guildId } }).catch(() => 0);
    const embeddedChunkCount = await prisma.knowledgeChunk.count({
      where: { guildId, embedding: { not: null } }
    }).catch(() => 0);

    const lastSource = await prisma.knowledgeSource.findFirst({
      where: { guildId },
      orderBy: { createdAt: 'desc' }
    });

    const hasOpenAIKey = !!env.OPENAI_API_KEY;

    const stats = [
      `**Database Connected:** ${dbConnected ? '✅ Yes' : '❌ No'}`,
      `**Knowledge Sources:** ${sourceCount}`,
      `**Knowledge Chunks:** ${chunkCount}`,
      `**Chunks with Embeddings:** ${embeddedChunkCount}`,
      `**Missing Embeddings:** ${chunkCount - embeddedChunkCount}`,
      `**OpenAI Key Detected:** ${hasOpenAIKey ? '✅ Yes' : '❌ No'}`,
      `**Chat Model:** \`${env.OPENAI_CHAT_MODEL}\``,
      `**Embedding Model:** \`${env.OPENAI_EMBEDDING_MODEL}\``,
      '',
      `**Last Imported Source:** ${lastSource ? lastSource.title : 'None'}`
    ].join('\n');

    await message.reply({ embeds: [embeds.info(stats, 'Knowledge Base Status')] });
  },
};
