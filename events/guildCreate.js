module.exports = async (bot, guild) => {
	const { config, logger } = bot;
	const { name, id, memberCount: members } = guild;

	if (config.serversBlacklist.includes(id)) {
		logger.log(`Blacklisted guild join "${name}" (${id}) with ${members.toLocaleString('de-DE')} members. Leaving...`, 'log');
		guild.leave();
		return;
	}

	logger.log(`Joined "${name}" (${id}) with ${members.toLocaleString('de-DE')} members. Servers: ${bot.guilds.cache.size}`, 'log');
};