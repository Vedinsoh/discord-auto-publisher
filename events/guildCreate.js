module.exports = async (bot, guild) => {
	const { config, logger } = bot;
	const { name, id, memberCount } = guild;

	const members = memberCount.toLocaleString(config.log.locale);

	if (config.serversBlacklist.includes(id)) {
		logger.log(`Blacklisted guild join "${name}" (${id}) with ${members} members. Leaving.`);
		guild.leave();
		return;
	}

	logger.log(`Joined "${name}" (${id}) with ${members} members. Servers: ${bot.guilds.cache.size}`);
};