const { buildWelcomeSlashCommand } = require('../shared/welcome');

module.exports = buildWelcomeSlashCommand({
  name: 'welcome-enable',
  description: 'Enable the welcome system',
  mode: 'welcome-enable',
});