const { buildWelcomeSlashCommand } = require('../shared/welcome');

module.exports = buildWelcomeSlashCommand({
  name: 'welcome-preview',
  description: 'Preview the welcome embed',
  mode: 'welcome-preview',
});