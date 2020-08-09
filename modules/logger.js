const chalk = require('chalk');
const moment = require('moment');

exports.log = (content, type = 'log') => {
	const types = {
		log: ['bgBlue'],
		warn: ['bgYellow', 'black'],
		error: ['bgRed'],
		debug: ['bgBlack', 'green'],
		ready: ['bgGreen', 'black'],
		info: ['bgMagenta', 'black'],
	};

	const timestamp = `[${moment().format('DD.MM.YYYY. HH:mm:ss.SSS')}]`;

	function logType(label, bgColor, textColor = 'white') {
		return console.log(`${timestamp} ${chalk[textColor][bgColor](label.toUpperCase())} ${content} `);
	}

	if (Object.keys(types).includes(type)) {
		return logType(type, ...types[type]);
	}
	else {
		throw new TypeError(`Valid logger types: ${Object.keys(types)}`);
	}
};

for (const type of ['error', 'warn', 'debug']) {
	exports[type] = (...args) => this.log(...args, type);
}