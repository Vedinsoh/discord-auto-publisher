const chalk = require('chalk');
const moment = require('moment');
const { log } = require('../config.json');

exports.log = (content, type = 'log') => {

	const levels = ['info', 'log', 'debug'];

	if (!levels.includes(log.loggingLevel)) throw new TypeError(`Valid logging levels: ${levels.join(', ')}`);
	if (levels.includes(type)) {
		if (levels.indexOf(type) > levels.indexOf(log.loggingLevel)) return;
	}

	const types = {
		log: ['bgBlue'],
		info: ['bgMagenta', 'black'],
		debug: ['bgBlack', 'green'],
		ready: ['bgGreen', 'black'],
		warn: ['bgYellow', 'black'],
		error: ['bgRed'],
	};

	const timestamp = `[${moment().format(log.timeFormat)}]`;

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