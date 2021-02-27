const
	Spam = require('../modules/SpamManager.js'),
	String = require('../modules/Stringificator.js'),
	logger = require('../modules/Logger.js'),
	bot = require('../bot.js'),
	config = require('../config.json');

module.exports = async guild => {
	if (Spam.blacklistCheck(guild, { leave: true })) return;

	const members = guild.memberCount.toLocaleString(config.log.locale) || 'unknown';
	logger.log(`Joined ${String.guild(guild)} with ${members} members. Servers: ${bot.guilds.cache.size}`);
};