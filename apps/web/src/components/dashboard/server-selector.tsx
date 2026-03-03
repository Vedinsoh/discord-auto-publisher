import { Bot, ChevronRight, Crown, Sparkles, TriangleAlert } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { DiscordGuild } from '@/lib/api/types';
import type { DashboardUser } from './guild-context';
import { UserBadge } from './user-badge';

interface ServerSelectorProps {
  guilds: DiscordGuild[];
  user: DashboardUser;
  error?: boolean;
}

function guildIconUrl(guild: DiscordGuild): string | null {
  if (!guild.icon) return null;
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=128`;
}

function hasBotPresent(guild: DiscordGuild): boolean {
  return guild.freeBotPresent || guild.premiumBotPresent;
}

function guildSortOrder(guild: DiscordGuild): number {
  if (guild.premiumBotPresent) return 0;
  if (guild.freeBotPresent) return 1;
  return 2;
}

function sortGuilds(guilds: DiscordGuild[]): DiscordGuild[] {
  return [...guilds].sort((a, b) => {
    const orderDiff = guildSortOrder(a) - guildSortOrder(b);
    if (orderDiff !== 0) return orderDiff;
    return a.name.localeCompare(b.name);
  });
}

export function ServerSelector({ guilds, user, error }: ServerSelectorProps) {
  const sortedGuilds = sortGuilds(guilds);
  return (
    <div className="min-h-screen px-4 pt-24 pb-16">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl text-white mb-2">Select a Server</h1>
              <p className="text-slate-400">Choose which server you&apos;d like to manage</p>
            </div>
            <UserBadge user={user} />
          </div>
        </div>

        {error ? (
          <Card className="bg-slate-900/50 border-slate-800 p-12 text-center">
            <TriangleAlert className="w-8 h-8 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400 mb-2">Something went wrong</p>
            <p className="text-slate-500 text-sm">Please try again later</p>
          </Card>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              {sortedGuilds.map(guild => {
                const iconUrl = guildIconUrl(guild);
                const disabled = !hasBotPresent(guild);
                const content = (
                  <Card
                    key={guild.id}
                    className={`p-6 transition-all group ${
                      disabled
                        ? 'bg-slate-900/30 border-slate-800/50 opacity-60 cursor-default hover:opacity-80'
                        : 'bg-slate-900/50 border-slate-800 hover:border-blue-500/50 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 bg-linear-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-3xl shrink-0 overflow-hidden">
                          {iconUrl ? (
                            <Image
                              src={iconUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              width={64}
                              height={64}
                            />
                          ) : (
                            <span className="text-white text-lg font-semibold">
                              {guild.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-white text-lg truncate">{guild.name}</h3>
                            {guild.hasSubscription && (
                              <Crown className="w-5 h-5 text-yellow-500 shrink-0" />
                            )}
                          </div>
                          {guild.hasSubscription ? (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              Premium Active
                            </Badge>
                          ) : guild.premiumBotPresent ? (
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                              <Sparkles className="w-3 h-3 mr-1" />
                              Premium Bot
                            </Badge>
                          ) : guild.freeBotPresent ? (
                            <Badge className="bg-slate-700/50 text-slate-400 border-slate-600">
                              Free Plan
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-800/50 text-slate-500 border-slate-700">
                              <Bot className="w-3 h-3 mr-1" />
                              Bot not added
                            </Badge>
                          )}
                        </div>
                      </div>
                      {!disabled && (
                        <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-colors shrink-0" />
                      )}
                    </div>

                    {hasBotPresent(guild) && (
                      <div className="pt-4 border-t border-slate-800">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">
                            {guild.hasSubscription
                              ? 'Premium'
                              : guild.premiumBotPresent
                                ? 'Premium Bot'
                                : 'Free'}{' '}
                            plan
                          </span>
                          <span className="text-blue-400 group-hover:underline">Manage &rarr;</span>
                        </div>
                      </div>
                    )}
                  </Card>
                );

                if (disabled) {
                  return <div key={guild.id}>{content}</div>;
                }

                return (
                  <Link key={guild.id} href={`/dashboard/${guild.id}`} className="block">
                    {content}
                  </Link>
                );
              })}
            </div>

            {guilds.length === 0 && (
              <Card className="bg-slate-900/50 border-slate-800 p-12 text-center">
                <p className="text-slate-400 mb-2">No servers found</p>
                <p className="text-slate-500 text-sm">
                  Make sure you have Manage Server permission in the servers you want to manage
                </p>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
