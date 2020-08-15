module.exports = async (bot, error, shardID) => {
	const { logger } = bot;
	logger.log(`Shard (ID: ${shardID}) error:\n${JSON.stringify(error)}`, 'error');
};