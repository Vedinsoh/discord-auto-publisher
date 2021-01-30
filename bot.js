require('dotenv').config();

const { Client } = require('discord.js-light');
const bot = new Client({
	shards: 'auto',
	cacheGuilds: true,
	cacheChannels: true,
	cacheOverwrites: false,
	cacheRoles: false,
	cacheEmojis: false,
	cachePresences: false,
	messageCacheMaxSize: 0,
});

require('./modules/Initialization.js')(bot);

// Promise rejection handler
process.on('unhandledRejection', error => console.error(error));

module.exports = bot;