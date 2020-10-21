const fs = require('fs');

module.exports = (bot) => {
	// Load events
	const eventsDir = './events/';
	fs.readdir(eventsDir, (error, files) => {
		if (error) return console.error(error);

		files.forEach((file) => {
			if (!file.endsWith('.js')) return;
			const event = require(`.${eventsDir}${file}`);
			bot.on(file.split('.')[0], event.bind(null));
			delete require.cache[require.resolve(`.${eventsDir}${file}`)];
		});
	});

	// Load bot owner commands
	bot.commands = new Map();
	const commandsDir = '/owner_commands/';
	fs.readdir(`./modules${commandsDir}`, (error, files) => {
		if (error) return console.error(error);

		files.forEach(file => {
			if (!file.endsWith('.js')) return;
			const functions = require(`.${commandsDir}${file}`);
			bot.commands.set(file.split('.')[0], functions);
		});
	});

	bot.login(process.env.BOT_TOKEN);
};