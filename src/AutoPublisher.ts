import Cluster from 'discord-hybrid-sharding';
import { Intents, Options } from 'discord.js-light';
import crosspostQueueFilter from '#functions/crosspostQueueFilter';
import { AutoPublisherClient } from '#structures/Client';

const { FLAGS } = Intents;
const shardData = Cluster.Client.getInfo();
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
  partials: ['CHANNEL'],
  shards: shardData.SHARD_LIST,
  shardCount: shardData.TOTAL_SHARDS,
  restGlobalRateLimit: 50,
  rejectOnRateLimit: crosspostQueueFilter,
});

client.start();

export default client;
