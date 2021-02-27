const
	fetch = require('node-fetch'),
	urlRegex = require('url-regex-safe'),
	Spam = require('./SpamManager.js'),
	Util = require('./UtilFunctions.js'),
	String = require('./Stringificator.js'),
	logger = require('./Logger.js'),
	bot = require('../bot.js');

async function crosspost(message) {
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
}

const pending = new Set();

module.exports = async (message, update = false) => {
	const pendingCrosspost = () => {
		if (pending.has(message.id)) {
			crosspost(message);
			pending.delete(message.id);
		}
	};

	if (update) {
		pendingCrosspost();
		return;
	}

	if (urlRegex({ strict: true, localhost: false }).test(message.content) && !message.embeds.length) {
		pending.add(message.id);
		setTimeout(() => {
			pendingCrosspost();
		}, 7 * 1000);
	}
	else {
		crosspost(message);
	}
};