const blacklist = require('../blacklistManager.js');

exports.run = async (message, guildID) => {
	blacklist.blacklistUpdate('remove', guildID)
		.then(response => message.channel.send(response));
};