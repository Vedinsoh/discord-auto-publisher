const Spam = require('../SpamManager.js');

exports.run = async (message, guildID) => {
	Spam.blacklistUpdate('add', guildID)
		.then(response => message.channel.send(response));
};