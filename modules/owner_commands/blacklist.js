const blacklist = require('../blacklistManager.js');

exports.run = async (message, guildID) => {
	blacklist.blacklistUpdate('add', guildID)
		.then(response => message.channel.send(response));
};