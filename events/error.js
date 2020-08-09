module.exports = async (bot, error) => {
	const { logger } = bot;
	logger.log(`Discord.js error: \n${JSON.stringify(error)}`, 'error');
};