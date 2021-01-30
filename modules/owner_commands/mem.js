const { log } = require('../../config.json');

exports.run = async message => {
	message.channel.send(`${(process.memoryUsage().rss / (1024 ** 2)).toLocaleString(log.locale, { maximumFractionDigits: 2 })} MB`);
};