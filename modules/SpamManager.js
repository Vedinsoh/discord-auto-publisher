const
	FS = require('fs'),
	{ default: PQueue } = require('p-queue'),
	Util = require('./UtilFunctions.js'),
	String = require('./Stringificator.js'),
	logger = require('./Logger.js'),
	bot = require('../bot.js'),
	{ spam } = require('../config.json');

const
	blacklistFile = './serversBlacklist.json',
	blacklist = require(`.${blacklistFile}`),
	blacklistQueue = new PQueue({ concurrency: 1 }),
	spamReportedGuilds = new Map(),
	hourlySpamLimit = new Map();

class SpamManager {
	constructor() {
		throw new Error(`The ${this.constructor.name} class may not be instantiated.`);
	}

	static blacklistCheck(guild, options = { leave: false }) {
		if (!guild) return false;
		if (blacklist.includes(typeof guild === 'object' ? guild.id :
			guild.match(/^\d{18}$/) ? guild : '')) {
			if (options.leave) this.leaveGuild(guild);
			return true;
		}
		else { return false; }
	}

	static startupCheck() {
		logger.debug('Checking for blacklisted guilds.');
		for (const id of blacklist) {
			const guild = bot.guilds.cache.get(id);
			if (guild) this.leaveGuild(guild);
		}
	}

	static leaveGuild(guild) {
		guild.leave()
			.then(() => logger.log(`Blacklisted guild: ${String.guild(guild)}. Leaving.`))
			.catch(error => logger.error(error));
	}

	static cacheAudit() {
		logger.debug('Auditing the spam channels in cache.');
		const now = Date.now();

		spamReportedGuilds.forEach((value, key) => {
			if ((now - value.reportTime) >= (1000 * 60 * 60 * spam.cacheExpirationHours)) {
				spamReportedGuilds.delete(key);
			}
		});
	}

	static addSpamChannel(channel, timeout) {
		const channelID = channel.id;

		if (!hourlySpamLimit.has(channelID)) {
			hourlySpamLimit.set(channelID, { count: 1, remaining: timeout });

			Util.debugLog(channel, 'rateLimited', spam.monitoringEnabled ? hourlySpamLimit.get(channelID).count : false);

			setTimeout(() => {
				hourlySpamLimit.delete(channelID);
				logger.debug(`Rate limit counter reset for ${String.channel(channel)}`);
			}, timeout);
		}
		else {
			hourlySpamLimit.get(channelID).count++;
		}
	}

	static rateLimitCheck(channel) {
		const channelID = channel.id,
			guildID = channel.guild.id,
			now = Date.now();

		if (hourlySpamLimit.has(channelID)) {
			if (!spam.monitoringEnabled) return true;

			const spamChannel = hourlySpamLimit.get(channelID);
			spamChannel.count++;

			if (spamChannel.count >= (spam.messagesHourlyLimit - 10)) {
				logger.log(`${String.channel(channel)} in ${String.guild(channel.guild)} hit the hourly spam limit (${spam.messagesHourlyLimit}).`);
				this.blacklistUpdate('add', guildID);
				hourlySpamLimit.delete(channelID);
				if (spamReportedGuilds.has(guildID)) spamReportedGuilds.delete(guildID);
				return true;
			}

			Util.debugLog(channel, 'rateLimited', spamChannel.count);

			const flagged = () => logger.log(`${String.guild(channel.guild)} spam flag in ${String.channel(channel)} (${spamReportedGuilds.get(guildID).channels.size}/${spam.spamChannelsThreshold}).`);

			if (spamChannel.count >= Math.floor((spam.messagesHourlyLimit - 10) * (2 / 3))) {
				if (spamReportedGuilds.has(guildID)) {
					const spamGuild = spamReportedGuilds.get(guildID);

					if (spamGuild.channels.has(channelID)) {
						if ((now - spamGuild.channels.get(channelID)) >= spamChannel.remaining) {
							spamGuild.channels.set(channelID, now);
							spamGuild.count++;
							flagged();
						}
					}
					else {
						spamGuild.channels.set(channelID, now);
						spamGuild.count++;
						flagged();
					}

					if (spamGuild.count >= spam.spamChannelsThreshold) {
						logger.log(`${String.guild(channel.guild)} hit the channels spam threshold (${spam.spamChannelsThreshold}).`);
						this.blacklistUpdate('add', guildID);
						spamReportedGuilds.delete(guildID);
					}
				}
				else {
					spamReportedGuilds.set(guildID, {
						count: 1,
						channels: new Map([[channelID, now]]),
						reportTime: now,
					});
					flagged();
				}
			}
			return true;
		}
		else {
			return false;
		}
	}

	static async blacklistUpdate(action, guildID) {
		return await blacklistQueue.add(() => this.blacklistUpdateJSON(action, guildID));
	}

	static async blacklistUpdateJSON(action, guildID) {
		return new Promise(reply => {
			if (guildID !== undefined &&
				!guildID.match(/^\d{18}$/)) {
				return reply('Invalid server ID provided.');
			}

			FS.readFile(blacklistFile, (error, data) => {
				const list = JSON.parse(data);
				const arrays = [blacklist, list];

				switch (action) {
				case 'add':
					if (!list.includes(guildID)) {
						const guild = bot.guilds.cache.get(guildID);
						if (guild) {
							for (const array of arrays) array.push(guildID);
							this.leaveGuild(guild);
						}
						else { return reply('Invalid server ID provided.'); }
					}
					else { return reply(`${guildID} is already blacklisted.`); }
					break;
				case 'remove':
					if (list.includes(guildID)) {
						for (const array of arrays) {
							array.indexOf(guildID) > -1
								? array.splice(array.indexOf(guildID), 1)
								: false;
						}
						break;
					}
					else { return reply(`${guildID} is not blacklisted.`); }
				}

				FS.writeFile(blacklistFile, JSON.stringify(list, null, 4), err => {
					if (err) {
						const object = JSON.stringify(err, null, 4);
						logger.error(object);
						return reply(`An error has occured:\n${object}`);
					}
					const response = `Blacklist ${action}: ${guildID}`;
					logger.log(response);
					return reply(response);
				});
			});
		});
	}
}

module.exports = SpamManager;