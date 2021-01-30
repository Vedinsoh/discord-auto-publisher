const logger = require('../modules/Logger.js');

module.exports = async (error, shardID) => {
	logger.error(`Shard (ID: ${shardID}) error:\n${JSON.stringify(error, null, 4)}`);
};