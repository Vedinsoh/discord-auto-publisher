const Spam = require('../SpamManager.js');

exports.run = async (message, guildID) => {
	message.channel.send(`Server is ${Spam.blacklistCheck(guildID) ? '' : 'not '}blacklisted.`);
};