const bot = require('../bot.js').bot;
const config = require('../config.json');
const logger = require('./logger.js');
const str = require('./stringificator.js');
const fn = require('./eventFunctions.js');

const rateLimitsSpam = new Map();
const spamReportedChannels = new Set();

// API spam management
exports.rateLimitCheck = async (message) => {
	const { channel } = message;
	if (rateLimitsSpam.has(channel.id)) {
		rateLimitsSpam.get(channel.id).count++;

		if ((rateLimitsSpam.get(channel.id).count >= config.spamThreshold) && !spamReportedChannels.has(channel.id)) {
			const owner = await bot.users.fetch(channel.guild.ownerID);
			await bot.users.fetch(config.botOwner)
				.then((user) => {
					user.send(`**Spam channel report**\n\nChannel: ${str.stringifyChannel(channel)}\nServer: ${str.stringifyGuild(channel.guild)}, owner: ${str.stringifyUsers(owner)[0]}`);
				})
				.catch((error) => logger.log(error, 'error'));

			spamReportedChannels.add(channel.id);
		}
		fn.consoleWarn(message, 'rateLimited', rateLimitsSpam.get(channel.id).count);
		return true;
	}
	else { return false; }
};

exports.addSpamChannel = (message, timeout) => {
	const { channel } = message;
	rateLimitsSpam.set(channel.id, { count: 1 });

	setTimeout(() => {
		rateLimitsSpam.delete(channel.id);
		logger.log(`Rate limit counter reset for ${str.stringifyChannel(channel)}`, 'debug');
	}, timeout);

	fn.consoleWarn(message, 'rateLimited', rateLimitsSpam.get(channel.id).count);
};