module.exports = async bot => {
	const { config, logger } = bot;
	function presence() {
		bot.user
			.setPresence({
				activity: {
					name: `${bot.guilds.cache.size} servers`,
					type: 'WATCHING',
				},
				status: 'online',
			})
			.catch((err) => {
				logger.log(err, 'error');
				return;
			});
	}

	presence();
	setInterval(() => {
		presence();
	}, config.presenceInterval * 60 * 60 * 1000);
	logger.log(`Connected! Servers: ${bot.guilds.cache.size}`, 'ready');

	logger.log('Checking for blacklisted guilds...', 'log');
	bot.guilds.cache.forEach(guild => {
		const { name, id } = guild;
		if (config.serversBlacklist.includes(id)) {
			logger.log(`Blacklisted guild: "${name}" (${id}). Leaving...`, 'log');
			guild.leave();
		}
	});
};