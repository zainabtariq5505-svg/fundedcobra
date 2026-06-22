const logger = require('../utils/logger');
const prisma = require('../database/prisma');
const { scheduleDailyReports } = require('../services/reportService');
const scheduler = require('../services/schedulerService');
const { initializeGuildInvites } = require('../services/inviteService');

module.exports = {
  name: 'ready',
  once: true,

  async execute(client) {
    logger.info(`FundedCobra Bot is online! Logged in as ${client.user.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guild(s)`);

    // Set bot presence
    client.user.setPresence({
      status: 'dnd',
      activities: [{
        name: 'www.fundedcobra.com',
        type: 0, // Watching
      }],
    });

    // Ensure guild settings exist for all guilds
    for (const [guildId] of client.guilds.cache) {
      await prisma.guildSettings.upsert({
        where:  { guildId },
        create: { guildId },
        update: {},
      }).catch(() => {});

      await prisma.welcomeSettings.upsert({
        where: { guildId },
        create: { guildId },
        update: {},
      }).catch(() => {});

      await prisma.modSettings.upsert({
        where: { guildId },
        create: { guildId },
        update: {},
      }).catch(() => {});

      await prisma.socialNotifierSettings.upsert({
        where: { guildId },
        create: { guildId },
        update: {},
      }).catch(() => {});

      await prisma.inviteSettings.upsert({
        where: { guildId },
        create: { guildId },
        update: {},
      }).catch(() => {});

      await prisma.xPSettings.upsert({
        where: { guildId },
        create: { guildId },
        update: {},
      }).catch(() => {});

      await prisma.transcriptSettings.upsert({
        where: { guildId },
        create: { guildId },
        update: {},
      }).catch(() => {});

      await prisma.boosterSettings.upsert({
        where: { guildId },
        create: { guildId },
        update: {},
      }).catch(() => {});

      await prisma.autoRoleSettings.upsert({
        where: { guildId },
        create: { guildId },
        update: {},
      }).catch(() => {});

      // Cache invite counts for join detection
      const guild = client.guilds.cache.get(guildId);
      if (guild) await initializeGuildInvites(guild).catch(() => {});
    }

    scheduler.start(client);
    logger.info('Bot initialization complete.');

    scheduleDailyReports(client, 9, 0);
  },
};