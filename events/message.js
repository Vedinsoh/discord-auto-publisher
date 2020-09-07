const fetch = require('node-fetch');

const config = require('../config.json');
const logger = require('../modules/logger.js');

const cache = new Map();
const rateLimits = new Map();
const reportedChannels = new Set();

module.exports = async (bot, message) => {

	if (!cache.has(message.channel.id)) {
		const fetched = await bot.channels.fetch(message.channel.id, false);
		cache.set(fetched.id, [fetched.type, fetched.name, new Date()]);
	}

	const channelCache = cache.get(message.channel.id);

	if (channelCache[0] === 'news') {
		const { options: { http }, rest } = bot;
		const { guild, channel, author } = message;

		const consoleWarn = async (reason) => {
			let entry = '';
			const owner = await bot.users.fetch(message.guild.ownerID);

			const logAssets = {
				channel: `Channel: #${channelCache[1]} (${channel.id})`,
				server: `Server: "${guild.name}" (${guild.id}), owner: ${owner.username}#${owner.discriminator} (${owner.id})`,
				author: `Author: ${author.username}#${author.discriminator} (${author.id}) ${message.webhookID ? '- Webhook' : ''}`,
				message: `Message content: ${message.embeds[0] !== undefined ? `${message.content}\n* Embed:\n${JSON.stringify(message.embeds[0], (key, value) => { if (value !== null) return value; }, 2)}` : message.content}`,
			};

			const addAsset = (...assets) => {
				assets.forEach(asset => {
					entry += `\n${logAssets[asset]}`;
				});
			};

			if (reason == 'rateLimited') {
				entry += `Channel is being rate limited! Count: ${rateLimits.get(channel.id).count}, threshold: ${config.spamThreshold}`;
				addAsset('channel', 'server', 'author', 'message');
			}
			else {
				entry += reason;
				addAsset('channel', 'server');
			}

			logger.log(entry, 'warn');
		};

		// Reports a rate limited channel in console, sends a DM to the bot owner if spam is above the threshold
		if (rateLimits.has(channel.id)) {
			rateLimits.get(channel.id).count++;

			if ((rateLimits.get(channel.id).count >= config.spamThreshold) && !reportedChannels.has(channel.id)) {
				const owner = await bot.users.fetch(message.guild.ownerID);
				await bot.users.fetch(config.botOwner)
					.then((user) => {
						user.send(`**Spam channel report**\n\nChannel: #${channelCache[1]} (${channel.id})\nServer: "${guild.name}" (${guild.id}), owner: ${owner.username}#${owner.discriminator} (${owner.id})`);
					})
					.catch((error) => logger.log(error, 'error'));

				reportedChannels.add(channel.id);
			}

			consoleWarn('rateLimited');
			return;
		}

		// Publish the message and check if the channel is being rate limited or missing permissions
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
					consoleWarn(`${json.message} (Code: ${json.code})`);
				}
				else if (json.retry_after !== undefined) {
					rateLimits.set(channel.id, { count: 1 });

					setTimeout(() => {
						rateLimits.delete(channel.id);
						logger.log(`Rate limit counter reset for ${channel.id}`, 'debug');
					}, json.retry_after);

					consoleWarn('rateLimited');
				}
				else {
					logger.log(`Published ${message.id} in #${channelCache[1]} (${channel.id}) - "${guild.name}" (${guild.id})`);
				}
			});
	}
};

const cacheInterval = config.cacheInterval * 60 * 60 * 1000;
setInterval(() => {
	logger.log('Starting the channel cache clearing interval.', 'debug');

	let count = 0;
	const now = new Date();

	cache.forEach((props, id) => {
		if ((now - props[2]) >= cacheInterval) {
			cache.delete(id);
			count++;
		}
	});

	logger.log(`Cleared ${count.toLocaleString(config.log.locale)} channel${count == 1 ? '' : 's'} from cache.`, 'debug');
}, cacheInterval);