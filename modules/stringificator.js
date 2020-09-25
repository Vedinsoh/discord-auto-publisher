exports.stringifyGuild = (guild) => {
	return `"${guild.name}" (${guild.id})`;
};

exports.stringifyChannel = (channel) => {
	return `#${channel.name} (${channel.id})`;
};

exports.stringifyUsers = (...users) => {
	const usersArray = [];
	for (const user of users) {
		usersArray.push(`${user.username}#${user.discriminator} (${user.id})`);
	}
	return usersArray;
};