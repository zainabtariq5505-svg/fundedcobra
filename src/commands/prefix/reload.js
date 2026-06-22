const { checkAdminMessage } = require('../../utils/adminCheck');
const embeds = require('../../utils/embeds');

module.exports = {
  name: 'reload',
  description: 'Reload bot presence and status',
  usage: '!reload',
  adminOnly: true,

  async execute(message, args, client) {
    if (!await checkAdminMessage(message)) return;

    client.user.setPresence({
      status: 'online',
      activities: [{ name: 'FundedCobra Support | !help', type: 0 }],
    });

    await message.reply({ embeds: [embeds.success('Bot presence reloaded successfully.')] });
  },
};
