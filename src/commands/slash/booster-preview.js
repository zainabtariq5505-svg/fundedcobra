const { buildBoosterSlashCommand } = require('../shared/booster');

module.exports = buildBoosterSlashCommand({
  name: 'booster-preview',
  description: 'Preview the booster appreciation message using yourself as sample booster',
  mode: 'booster-preview',
});
