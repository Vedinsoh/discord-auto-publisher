const { commands } = require('../bot.js');
const { botOwner } = require('../config.json');
const crosspost = require('../modules/Crosspost.js');

module.exports = async message => {
	// Publish (crosspost) the message
	if (message.channel.type === 'news') crosspost(message);

	// DM commands handler for the bot owner
	if (message.channel.type === 'dm' && message.author.id === botOwner) {
		const [command, argument] = message.content
			.toLowerCase()
			.split(/ +/g)
			.splice(0, 2);

		const cmd = commands.get(command);
		if (!cmd) return;
		cmd.run(message, argument);
	}
};