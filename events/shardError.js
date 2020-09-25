const logger = require('../modules/logger.js');

module.exports = async (error, shardID) => {
	logger.log(`Shard (ID: ${shardID}) error:\n${JSON.stringify(error, null, 4)}`, 'error');
};