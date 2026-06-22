const { buildBoosterSlashCommand } = require('../shared/booster');

module.exports = buildBoosterSlashCommand({
  name: 'remove-booster-role',
  description: 'Remove the configured booster reward role',
  mode: 'remove-booster-role',
});
