import { data } from 'discord-hybrid-sharding';
import { Options, Intents } from 'discord.js-light';
import { AutoPublisherClient } from '#structures/Client';
import crosspostQueueFilter from '#functions/crosspostQueueFilter';

const { FLAGS } = Intents;
const client = new AutoPublisherClient({
  makeCache: Options.cacheWithLimits({
    ApplicationCommandManager: 0,
    BaseGuildEmojiManager: 0,
    GuildChannelManager: Infinity,
    GuildBanManager: 0,
    GuildInviteManager: 0,
    GuildManager: Infinity,
    GuildMemberManager: 0,
    GuildStickerManager: 0,
    GuildScheduledEventManager: 0,
    MessageManager: 0,
    PermissionOverwriteManager: 0,
    PresenceManager: 0,
    ReactionManager: 0,
    ReactionUserManager: 0,
    RoleManager: 0,
    StageInstanceManager: 0,
    ThreadManager: 0,
    ThreadMemberManager: 0,
    UserManager: 0,
    VoiceStateManager: 0,
  }),
  intents: [FLAGS.GUILDS, FLAGS.GUILD_MESSAGES, FLAGS.DIRECT_MESSAGES],
  shards: data.SHARD_LIST,
  shardCount: data.TOTAL_SHARDS,
  restGlobalRateLimit: 50,
  rejectOnRateLimit: crosspostQueueFilter,
});

client.start();

export default client;
