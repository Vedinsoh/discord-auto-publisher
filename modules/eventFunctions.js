const bot = require('../bot.js').bot;
const config = require('../config.json');
const logger = require('./logger.js');
const str = require('./stringificator.js');

exports.consoleWarn = async (message, reason, count) => {
	const { guild, channel, author } = message;

	let entry = '';
	const owner = await bot.users.fetch(channel.guild.ownerID);

	const logAssets = {
		server: `Server: ${str.stringifyGuild(guild)}, owner: ${str.stringifyUsers(owner)[0]}`,
		channel: `Channel: ${str.stringifyChannel(channel)}`,
		author: `Author: ${str.stringifyUsers(author)[0]} ${message.webhookID ? '- Webhook' : ''}`,
		message: `Message content: ${message.embeds[0] !== undefined ? `${message.content}\n* Embed:\n${JSON.stringify(message.embeds[0], (key, value) => { if (value !== null) return value; }, 2)}` : message.content}`,
	};

	const addAsset = (...assets) => assets.forEach(asset => entry += `\n${logAssets[asset]}`);

	if (reason === 'rateLimited') {
		entry += `Channel is being rate limited! Count: ${count}, threshold: ${config.spamThreshold}`;
		addAsset('server', 'channel', 'author', 'message');
	}
	else {
		entry += reason;
		addAsset('server', 'channel');
	}

	logger.log(entry, 'warn');
};
exports.publishConfirm = (message) => {
	const { guild, channel, id } = message;
	logger.log(`Published ${id} in ${str.stringifyChannel(channel)} - ${str.stringifyGuild(guild)}`);
};