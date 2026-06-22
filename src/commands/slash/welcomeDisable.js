const { buildWelcomeSlashCommand } = require('../shared/welcome');

module.exports = buildWelcomeSlashCommand({
  name: 'welcome-disable',
  description: 'Disable the welcome system',
  mode: 'welcome-disable',
});