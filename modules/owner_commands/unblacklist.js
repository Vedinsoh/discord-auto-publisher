const Spam = require('../SpamManager.js');

exports.run = async (message, guildID) => {
	Spam.blacklistUpdate('remove', guildID)
		.then(response => message.channel.send(response));
};