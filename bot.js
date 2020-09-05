require('dotenv').config();
const Discord = require('discord.js-light');
const bot = new Discord.Client({
	cacheGuilds: true,
	cacheChannels: false,
	cacheOverwrites: false,
	cacheRoles: false,
	cacheEmojis: false,
	cachePresences: false,
});
const fs = require('fs');

bot.config = require('./config.json');
bot.logger = require('./modules/logger.js');
const { logger } = bot;

// Load events
fs.readdir('./events/', (err, files) => {
	if (err) return console.error(err);
	files.forEach((file) => {
		if (!file.endsWith('.js')) return;
		const event = require(`./events/${file}`);
		const eventName = file.split('.')[0];
		bot.on(eventName, event.bind(null, bot));
		delete require.cache[require.resolve(`./events/${file}`)];
	});
});

process.on('unhandledRejection', (error) => {
	logger.log(error.message, 'error');
});

bot.login(process.env.BOT_TOKEN);