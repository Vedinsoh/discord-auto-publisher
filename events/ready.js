module.exports = async bot => {
	const { config, logger } = bot;

	logger.log('Connected!', 'ready');
	logger.log('Caching guilds.', 'debug');

	function presence() {
		const servers = bot.guilds.cache.size.toLocaleString(config.log.locale);

		logger.log(`Updating presence. Servers: ${servers}`);
		bot.user
			.setPresence({
				activity: {
					name: `${servers} server${bot.guilds.cache.size > 1 ? 's' : ''}`,
					type: 'WATCHING',
				},
				status: 'online',
			})
			.catch((error) => {
				logger.log(error, 'error');
				return;
			});
	}

	presence();
	setInterval(() => {
		presence();
	}, config.presenceInterval * 60 * 1000);

	let totalMembers = 0;

	logger.log('Calculating total members across all servers.', 'debug');
	logger.log('Checking for blacklisted guilds.');
	bot.guilds.cache.forEach(guild => {
		const { name, id, memberCount: members } = guild;
		if (config.serversBlacklist.includes(id)) {
			logger.log(`Blacklisted guild: "${name}" (${id}). Leaving.`);
			guild.leave();
		}
		else {
			totalMembers += members;
		}
	});
	logger.log(`Publishing on ${bot.guilds.cache.size} servers with ${totalMembers.toLocaleString(config.log.locale)} total members.`, 'info');
};