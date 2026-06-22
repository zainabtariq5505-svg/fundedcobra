const { buildBoosterSlashCommand } = require('../shared/booster');

module.exports = buildBoosterSlashCommand({
  name: 'booster-list',
  description: 'List all current server boosters',
  mode: 'booster-list',
});
