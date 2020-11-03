const bot = require('../../bot.js').bot;

exports.run = async message => {
	message.channel.send('Shutting down...')
		.then (() => {
			bot.destroy();
			process.exit(0);
		});
};