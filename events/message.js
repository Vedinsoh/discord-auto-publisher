const fetch = require('node-fetch');

const bot = require('../bot.js').bot;
const config = require('../config.json');
const fn = require('../modules/eventFunctions.js');
const cache = require('../modules/cacheManager.js');

const { options: { http }, rest } = bot;

module.exports = async message => {
	const { channel } = message;

	if (channel.type === 'news') {
		// Check if channel is flagged for spamming the API
		if (await cache.rateLimitCheck(message)) return;

		// Publish the message and check if the channel is being rate limited by API
		await fetch(
			`${http.api}/v${http.version}/channels/${channel.id}/messages/${message.id}/crosspost`,
			{
				method: 'POST',
				headers: {
					'Authorization': `${rest.tokenPrefix} ${process.env.BOT_TOKEN}`,
				},
			},
		)
			.then((res) => res.json())
			.then((json) => {
				if (json.code !== undefined) {
					fn.consoleWarn(message, `${json.message} (Code: ${json.code})`);
				}
				else if (json.retry_after !== undefined) {
					cache.addSpamChannel(message, json.retry_after);
				}
				else {
					fn.publishConfirm(message);
					return;
				}
			});
	}

	// DM commands handler for the bot owner
	if (channel.type === 'dm' && message.author.id === config.botOwner) {
		const [command, argument] = message.content.toLowerCase().split(/ +/g).splice(0, 2);

		const cmd = bot.commands.get(command);
		if (!cmd) return;
		cmd.run(message, argument);
	}
};