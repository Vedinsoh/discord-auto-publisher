module.exports = async (bot, guild) => {
	const { config, logger } = bot;
	const { name, id, memberCount: members } = guild;

	if (config.serversBlacklist.includes(id)) return;
	logger.log(`Left "${name}" (${id}) with ${members.toLocaleString('de-DE')} members. Servers: ${bot.guilds.cache.size}`, 'log');
};