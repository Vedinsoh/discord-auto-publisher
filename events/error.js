const logger = require('../modules/logger.js');

module.exports = async error => {
	logger.log(JSON.stringify(error, null, 4), 'error');
};