const { buildBoosterSlashCommand } = require('../shared/booster');

module.exports = buildBoosterSlashCommand({
  name: 'booster-stats',
  description: 'View server boost statistics and booster system status',
  mode: 'booster-stats',
});
