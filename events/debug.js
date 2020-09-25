const logger = require('../modules/logger.js');

module.exports = async info => {
	logger.log(info, 'debug');
};