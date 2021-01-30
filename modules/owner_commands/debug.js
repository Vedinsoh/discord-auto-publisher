const { log } = require('../../config.json');
let setting = '';

exports.run = async (message, value) => {
	const enable = ['true', 'enable', 'accept', 'on', 'yes'];
	const disable = ['false', 'disable', 'deny', 'off', 'no'];

	const { channel } = message;

	if (enable.includes(value)) {
		if (!setting.length) setting = log.loggingLevel;
		log.loggingLevel = 'debug';
		channel.send('Debug mode on.');
	}
	else if (disable.includes(value)) {
		if (setting.length) {
			log.loggingLevel = setting;
		}
		else {
			log.loggingLevel = 'log';
		}
		channel.send('Debug mode off.');
	}
	else {
		channel.send(`Please provide a valid argument:\n\`${enable.join(', ')}\`\nor\n\`${disable.join(', ')}\``);
	}
};