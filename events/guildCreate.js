const bot = require('../bot.js').bot;
const config = require('../config.json');
const logger = require('../modules/logger.js');
const str = require('../modules/stringificator.js');
const blacklist = require('../modules/blacklistManager.js');

module.exports = async guild => {
	if (blacklist.check(guild, { leave: true })) return;

	const members = guild.memberCount.toLocaleString(config.log.locale);
	logger.log(`Joined ${str.stringifyGuild(guild)} with ${members} members. Servers: ${bot.guilds.cache.size}`);
};