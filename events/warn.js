const logger = require('../modules/Logger.js');

module.exports = async info => logger.warn(JSON.stringify(info, null, 4));