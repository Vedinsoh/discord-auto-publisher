const bot = require('../bot.js');
const config = require('../config.json');
const logger = require('../modules/Logger.js');
const String = require('../modules/Stringificator.js');
const Spam = require('../modules/SpamManager.js');

module.exports = async guild => {
	if (Spam.blacklistCheck(guild, { leave: true })) return;

	const members = guild.memberCount.toLocaleString(config.log.locale);
	logger.log(`Joined ${String.guild(guild)} with ${members} members. Servers: ${bot.guilds.cache.size}`);
};