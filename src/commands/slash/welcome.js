const { buildWelcomeSlashCommand } = require('../shared/welcome');

module.exports = buildWelcomeSlashCommand({
  name: 'welcome',
  description: 'Show the welcome system status',
  mode: 'welcome',
});