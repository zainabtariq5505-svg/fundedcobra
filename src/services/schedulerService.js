const logger = require('../utils/logger');

let interval = null;

function start(client) {
  if (interval) return;

  interval = setInterval(async () => {
    const { processEndedGiveaways } = require('./giveawayService');
    const { processDueAnnouncements } = require('./announcementService');
    const { processTempBans } = require('./moderationService');
    const { checkAllAccounts } = require('./socialNotifierService');

    await processEndedGiveaways(client).catch(err =>
      logger.error('Scheduler: giveaway error:', err.message)
    );
    await processDueAnnouncements(client).catch(err =>
      logger.error('Scheduler: announcement error:', err.message)
    );
    await processTempBans(client).catch(err =>
      logger.error('Scheduler: temp-ban expiry error:', err.message)
    );
    await checkAllAccounts(client).catch(err =>
      logger.error('Scheduler: social notifier error:', err.message)
    );
  }, 60_000);

  logger.info('Scheduler started (60s interval) — watching giveaways, announcements, temp bans & social notifiers.');
}

function stop() {
  if (interval) { clearInterval(interval); interval = null; }
}

module.exports = { start, stop };
