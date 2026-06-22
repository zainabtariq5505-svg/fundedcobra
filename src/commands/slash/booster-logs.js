const { buildBoosterSlashCommand } = require('../shared/booster');

module.exports = buildBoosterSlashCommand({
  name: 'booster-logs',
  description: 'View recent boost event logs',
  mode: 'booster-logs',
});
