class Stringificator {
	constructor() {
		throw new Error(`The ${this.constructor.name} class may not be instantiated.`);
	}

	static guild(guild) {
		return `"${guild.name}" (${guild.id})`;
	}
	static channel(channel) {
		return `#${channel.name} (${channel.id})`;
	}
	static users(...users) {
		const usersArray = [];
		for (const user of users) usersArray.push(`${user.username}#${user.discriminator} (${user.id})`);
		return usersArray;
	}
}

module.exports = Stringificator;