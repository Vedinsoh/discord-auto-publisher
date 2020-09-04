module.exports = async bot => {
	const { config, logger } = bot;

	logger.log('Connected!', 'ready');

	async function presence() {
		const servers = bot.guilds.cache.size.toLocaleString(config.log.locale);

		logger.log(`Updating presence. Servers: ${servers}`, 'debug');

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

	// Checks for blacklisted guilds and leaves them
	(async function() {
		logger.log('Checking for blacklisted guilds.', 'debug');

		for (const guild of config.serversBlacklist) {
			await bot.guilds.fetch(guild)
				.then(server => {
					if (server.name) {
						logger.log(`Blacklisted guild: "${server.name}" (${server.id}). Leaving.`);
						server.leave();
					}
				})
			// eslint-disable-next-line no-unused-vars, no-empty-function
				.catch(e => {});
		}
	})();

	// Calculates all members across all guilds
	let totalMembers = 0;
	(async function() {
		logger.log('Calculating total members across all servers.', 'debug');

		bot.guilds.cache.forEach(guild => {
			const { id, memberCount } = guild;
			if (!config.serversBlacklist.includes(id)) totalMembers += memberCount;
		});

		logger.log(`Publishing on ${bot.guilds.cache.size} servers with ${totalMembers.toLocaleString(config.log.locale)} total members.`, 'info');
	})();

};