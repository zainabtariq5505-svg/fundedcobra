const { buildWelcomeSlashCommand } = require('../shared/welcome');

module.exports = buildWelcomeSlashCommand({
  name: 'welcome-dm-enable',
  description: 'Enable welcome DMs',
  mode: 'welcome-dm-enable',
});