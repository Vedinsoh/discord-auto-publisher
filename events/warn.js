const logger = require('../modules/logger.js');

module.exports = async info => {
	logger.log(JSON.stringify(info, null, 4), 'warn');
};