import { getInfo } from 'discord-hybrid-sharding';
import { type CacheWithLimitsOptions, GatewayIntentBits as IntentBits, Options, Partials } from 'discord.js';
import config from '#config';
import AutoPublisherClient from '#structures/Client';

type CacheOptions = CacheWithLimitsOptions & {
  PermissionOverwriteManager: 0;
  RoleManager: 0;
};

const client = new AutoPublisherClient({
  makeCache: Options.cacheWithLimits({
    ApplicationCommandManager: 0,
    AutoModerationRuleManager: 0,
    BaseGuildEmojiManager: 0,
    GuildBanManager: 0,
    GuildEmojiManager: 0,
    GuildForumThreadManager: 0,
    GuildInviteManager: 0,
    GuildMemberManager: 0,
    GuildScheduledEventManager: 0,
    GuildStickerManager: 0,
    GuildTextThreadManager: 0,
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
  } as CacheOptions),
  intents: [IntentBits.Guilds, IntentBits.GuildMessages, IntentBits.DirectMessages, IntentBits.MessageContent],
  partials: [Partials.Channel],
  shards: getInfo().SHARD_LIST,
  shardCount: getInfo().TOTAL_SHARDS,
  rest: {
    globalRequestsPerSecond: config.requestsPerSecond,
  },
});

client.start();

export default client;
