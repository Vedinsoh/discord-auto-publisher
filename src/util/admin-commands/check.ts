import client from '#client';
import type { IBlacklistRecord } from '#schemas/database/BlacklistRecord';
import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/AdminCommandTypes';
import { EmbedBuilder } from '@discordjs/builders';

const recordPrefix: Record<IBlacklistRecord['type'], string> = {
  blacklist: '🔴',
  unblacklist: '🟢',
};

const parseRecord = (record: IBlacklistRecord) => {
  const timestamp = Math.floor((record.createdAt?.getTime() || 0) / 1000);
  const date = `<t:${timestamp}:f>`;
  const type = `${recordPrefix[record.type]} \`${record.type.toUpperCase()}\``;
  const reason = record.reason || 'No reason provided.';

  return `${type} [${date}] - ${reason}`;
};

export default new AdminCommand(CommandNames.CHECK, async ({ channel }, guildId) => {
  if (!guildId) {
    channel.send('Please provide server ID.');
    return;
  }

  const isBlacklisted = await client.blacklist.has(guildId);
  const records = await client.blacklist.getRecords(guildId);

  channel.send({
    content: `Server is ${!isBlacklisted ? 'not ' : ''}blacklisted.\n`,
    ...(Boolean(records.length) && {
      embeds: [
        new EmbedBuilder({
          title: 'Blacklist records',
          description: records
            .map((record) => parseRecord(record))
            .reverse()
            .join('\n\n'),
        }),
      ],
    }),
  });
});
