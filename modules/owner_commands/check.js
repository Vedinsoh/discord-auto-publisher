const blacklist = require('../blacklistManager.js');

exports.run = async (message, guildID) => {
	message.channel.send(`The server is ${blacklist.check(guildID) ? '' : 'not '}blacklisted.`);
};