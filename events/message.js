const fetch = require('node-fetch');

const rateLimitedChannels = new Set();

module.exports = async (bot, message) => {
	if (message.channel.type === 'news') {
		const { config, logger } = bot;
		const { channel, guild, author } = message;

		const consoleWarn = async (event) => {
			let entry = '';

			const owner = await bot.users.fetch(message.guild.ownerID);

			const logAssets = {
				channel: `Channel: #${channel.name} (${channel.id})`,
				server: `Server: "${guild.name}" (${guild.id}), owner: ${owner.username}#${owner.discriminator} (${owner.id})`,
				author: `Author: ${author.username}#${author.discriminator} (${author.id})`,
				message: `Message content: ${message.embeds[0] !== undefined ? `${message.content}\n* Embed:\n${JSON.stringify(message.embeds[0], (key, value) => { if (value !== null) return value; }, 2)}` : message.content}`,
			};

			const addAsset = (...assets) => {
				assets.forEach(asset => {
					entry += `\n${logAssets[asset]}`;
				});
			};

			switch (event) {
			case 'rateLimited':
				entry += 'Channel is being rate limited!';
				addAsset('channel', 'server', 'author', 'message');
				break;
			case 'missingPerms':
				entry += 'Missing permissions!';
				addAsset('channel', 'server');
				break;
			}

			logger.log(entry, 'warn');
		};

		if (rateLimitedChannels.has(channel.id)) {
			consoleWarn('rateLimited');
			return;
		}

		await fetch(
			`https://discord.com/api/v6/channels/${message.channel.id}/messages/${message.id}/crosspost`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bot ${process.env.TOKEN}`,
				},
			},
		)
			.then((res) => res.json())
			.then((json) => {
				if (json.code == 50001) {
					consoleWarn('missingPerms');
				}
				else if (json.retry_after !== undefined) {
					rateLimitedChannels.add(channel.id);

					setTimeout(() => {
						rateLimitedChannels.delete(channel.id);
					}, json.retry_after);

					consoleWarn('rateLimited');
				}
				else if (config.logging == 'debug') {
					logger.log(`Published ${message.id} in #${channel.name} (${channel.id}) - "${guild.name}" (${guild.id})`, 'debug');
				}
			});
	}
};