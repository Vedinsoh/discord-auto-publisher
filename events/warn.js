module.exports = async (bot, info) => {
	const { logger } = bot;
	logger.log(JSON.stringify(info), 'warn');
};