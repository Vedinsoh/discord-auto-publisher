const fetch = require('node-fetch');

const bot = require('../bot.js');
const logger = require('./Logger.js');
const String = require('./Stringificator.js');
const Spam = require('./SpamManager.js');
const Util = require('./UtilFunctions.js');

module.exports = async message => {
	const { channel } = message;

	if (Spam.rateLimitCheck(channel)) return;
	await fetch(
		`${bot.options.http.api}/v${bot.options.http.version}/channels/${channel.id}/messages/${message.id}/crosspost`,
		{
			method: 'POST',
			headers: {
				'Authorization': `${bot.rest.tokenPrefix} ${process.env.BOT_TOKEN}`,
			},
		},
	)
		.then(res => res.json())
		.then(json => {
			if (json.code) {
				Util.debugLog(channel, `${json.message} (Code: ${json.code})`);
			}
			else if (json.retry_after) {
				// Double check in case of high flow spam (since it's an async function)
				if (Spam.rateLimitCheck(channel)) return;
				Spam.addSpamChannel(channel, json.retry_after);
			}
			else {
				logger.debug(`Published ${message.id} in ${String.channel(channel)} - ${String.guild(message.guild)}`);
				return;
			}
		});
};