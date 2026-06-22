const { buildBoosterSlashCommand } = require('../shared/booster');

module.exports = buildBoosterSlashCommand({
  name: 'booster-enable',
  description: 'Enable the Server Booster Appreciation System',
  mode: 'booster-enable',
});
