const logger = require('../modules/logger.js');

module.exports = async info => {
	if (info.toLowerCase().includes('heartbeat')) return;
	logger.log(info, 'debug');
};