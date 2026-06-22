const { buildBoosterSlashCommand } = require('../shared/booster');

module.exports = buildBoosterSlashCommand({
  name: 'set-booster-message',
  description: 'Set the booster appreciation message (supports {user} {server} {boostCount} {boostTier} {brand})',
  mode: 'set-booster-message',
  configure: (b) =>
    b.addStringOption((o) =>
      o.setName('message')
        .setDescription('The booster message. Use {user} {username} {server} {boostCount} {boostTier} {brand}')
        .setRequired(true)
    ),
});
