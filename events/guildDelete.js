const bot = require('../bot.js').bot;
const config = require('../config.json');
const logger = require('../modules/logger.js');
const str = require('../modules/stringificator.js');
const blacklist = require('../modules/blacklistManager.js');

module.exports = async guild => {
	if (blacklist.check(guild)) return;

	const members = guild.memberCount.toLocaleString(config.log.locale);
	logger.log(`Left ${str.stringifyGuild(guild)} with ${members} members. Servers: ${bot.guilds.cache.size}`);
};