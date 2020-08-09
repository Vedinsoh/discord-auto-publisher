module.exports = async (bot, info) => {
	const { config, logger } = bot;
	if (config.logging == 'debug') logger.log(info, 'debug');
};