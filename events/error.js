const logger = require('../modules/Logger.js');

module.exports = async error => logger.error(JSON.stringify(error, null, 4));