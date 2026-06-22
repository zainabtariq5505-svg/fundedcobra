const { buildBoosterSlashCommand } = require('../shared/booster');

module.exports = buildBoosterSlashCommand({
  name: 'booster-disable',
  description: 'Disable the Server Booster Appreciation System',
  mode: 'booster-disable',
});
