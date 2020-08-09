module.exports = async (bot, guild) => {
	const { config, logger } = bot;
	const { name, id, memberCount: members } = guild;
	if (config.serversBlacklist.includes(id)) return;
	logger.log(`Left: "${name}" (${id}), members: ${members}`, 'log');
};