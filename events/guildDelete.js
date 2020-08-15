module.exports = async (bot, guild) => {
	const { config, logger } = bot;
	const { name, id, memberCount } = guild;

	const members = memberCount.toLocaleString(config.log.locale);

	if (config.serversBlacklist.includes(id)) return;
	logger.log(`Left "${name}" (${id}) with ${members} members. Servers: ${bot.guilds.cache.size}`, 'log');
};