const logger = require('../utils/logger');

module.exports = {
  name: 'error',
  once: false,

  execute(error) {
    logger.error('Discord client error:', error);
  },
};
