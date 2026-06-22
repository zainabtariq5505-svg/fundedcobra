const { buildWelcomeSlashCommand } = require('../shared/welcome');

module.exports = buildWelcomeSlashCommand({
  name: 'remove-welcome-role',
  description: 'Remove the welcome role',
  mode: 'remove-welcome-role',
});