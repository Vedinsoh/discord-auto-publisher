const
	String = require('./Stringificator.js'),
	logger = require('./Logger.js'),
	bot = require('../bot.js'),
	config = require('../config.json');

class UtilFunctions {
	constructor() {
		throw new Error(`The ${this.constructor.name} class may not be instantiated.`);
	}

	static presence() {
		const servers = bot.guilds.cache.size;
		logger.debug(`Updating presence. Servers: ${servers}`);

		bot.user.setPresence({
			activity: {
				name: `${servers} server${bot.guilds.cache.size > 1 ? 's' : ''}`,
				type: 'WATCHING',
			},
		})
			.catch(error => logger.error(error));
	}

	static debugLog(channel, reason, count) {
		if (!config.log.loggingLevel == 'debug') return;

		const { guild } = channel;
		let entry = '';

		const logAssets = {
			'server': `Server: ${String.guild(guild)}, owner: ${channel.guild.ownerID}`,
			'channel': `Channel: ${String.channel(channel)}`,
		};

		const addAsset = (...assets) => assets.forEach(asset => entry += `\n${logAssets[asset]}`);

		entry += reason === 'rateLimited' ? `${String.channel(channel)} - ${String.guild(guild)} is being rate limited!${count ? ` (${10 + count}/${config.spam.messagesHourlyLimit})` : ''}` : reason;

		if (reason !== 'rateLimited') addAsset('server', 'channel');
		logger.debug(entry);
	}
}

module.exports = UtilFunctions;