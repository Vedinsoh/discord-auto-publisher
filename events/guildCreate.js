module.exports = async (bot, guild) => {
	const { config, logger } = bot;
	const { name, id, memberCount: members } = guild;
	if (config.serversBlacklist.includes(id)) {
		logger.log(`Blacklisted guild join attempt: "${name}" (${id}), members: ${members}. Leaving...`, 'log');
		guild.leave();
		return;
	}
	logger.log(`Joined: "${name}" (${id}), members: ${members}`, 'log');
};