const logger = require('../modules/Logger.js');

module.exports = async info => {
	if (!info.match(/heartbeat/gi)) logger.debug(info);
};