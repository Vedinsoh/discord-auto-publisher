module.exports = async (bot, error) => {
	const { logger } = bot;
	logger.log(JSON.stringify(error), 'error');
};