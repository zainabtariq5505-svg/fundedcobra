const { buildWelcomeSlashCommand } = require('../shared/welcome');

module.exports = buildWelcomeSlashCommand({
  name: 'welcome-dm-disable',
  description: 'Disable welcome DMs',
  mode: 'welcome-dm-disable',
});