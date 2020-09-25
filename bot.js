require('dotenv').config();

const Discord = require('discord.js-light');
const bot = new Discord.Client({
	cacheGuilds: true,
	cacheChannels: true,
	cacheOverwrites: false,
	cacheRoles: false,
	cacheEmojis: false,
	cachePresences: false,
});

require('./modules/initialization.js')(bot);

// Promise rejection handler
const logger = require('./modules/logger.js');

process.on('unhandledRejection', (error) => {
	logger.log(JSON.stringify(error, null, 4), 'error');
});

// Login to Discord
bot.login(process.env.BOT_TOKEN);

module.exports = { bot };