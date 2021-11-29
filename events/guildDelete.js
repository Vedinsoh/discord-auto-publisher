const
	Spam = require('../modules/SpamManager.js'),
	String = require('../modules/Stringificator.js'),
	logger = require('../modules/Logger.js'),
	bot = require('../bot.js');

module.exports = async guild => {
	if (Spam.blacklistCheck(guild)) return;

	const members = guild.memberCount || 'unknown';
	logger.log(`Left ${String.guild(guild)} with ${members} members. Servers: ${bot.guilds.cache.size}`);
};