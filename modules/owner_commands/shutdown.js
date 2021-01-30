const bot = require('../../bot.js');

exports.run = async message => {
	if (message) await message.channel.send('Shutting down...');
	bot.destroy();
	process.exit(0);
};