const fs = require('fs');

const bot = require('../bot.js').bot;
const logger = require('./logger.js');
const str = require('./stringificator.js');

const blacklistFile = './serversBlacklist.json';
const blacklist = require(`.${blacklistFile}`);

exports.leaveGuild = (guild) => {
	guild.leave()
		.then(() => logger.log(`Blacklisted guild: ${str.stringifyGuild(guild)}. Leaving.`))
		.catch(error => logger.log(JSON.stringify(error), 'error'));
};

exports.check = (guild, options = { leave: false }) => {
	if (!guild) return false;
	if (blacklist.includes(typeof (guild) === 'object' ? guild.id :
		guild.match(/^\d{18}$/) ? guild : '')) {
		if (options.leave) exports.leaveGuild(guild);
		return true;
	}
	else { return false; }
};

exports.startupCheck = () => {
	for (const id of blacklist) {
		const guild = bot.guilds.cache.get(id);
		if (guild) exports.leaveGuild(guild);
	}
};

exports.blacklistUpdate = async (action, guildID) => {
	return new Promise(reply => {
		if (guildID !== undefined && !guildID.match(/^\d{18}$/)) return reply('Invalid server ID provided.');

		fs.readFile(blacklistFile, (error, data) => {
			const list = JSON.parse(data);

			const arrays = [blacklist, list];

			switch (action) {
			case 'add':
				if (!list.includes(guildID)) {
					const guild = bot.guilds.cache.get(guildID);
					if (guild) {
						for (const array of arrays) array.push(guildID);
						exports.leaveGuild(guild);
					}
					else {
						return reply('Invalid server ID provided.');
					}
				}
				else {
					return reply(`${guildID} is already blacklisted.`);
				}
				break;
			case 'remove':
				if (list.includes(guildID)) {
					for (const array of arrays) array.indexOf(guildID) > -1 ? array.splice(array.indexOf(guildID), 1) : false;
					break;
				}
				else {
					return reply(`${guildID} is not blacklisted.`);
				}
			}

			fs.writeFile(blacklistFile, JSON.stringify(list, null, 4), (err) => {
				if (err) {
					const object = JSON.stringify(err, null, 4);
					logger.log(object, 'error');
					return reply(`An error has occured:\n${object}`);
				}
				const response = `Blacklist ${action}: ${guildID}`;
				logger.log(response);
				return reply(response);
			});
		});
	});
};