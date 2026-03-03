import { Filter, Hash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { GuildChannel } from '@/lib/api/types';

interface FilterConfigProps {
  channels: GuildChannel[];
}

const filterTypeLabels: Record<string, string> = {
  keyword: 'Keyword',
  mention: 'Mention',
  author: 'Author',
  webhook: 'Webhook',
};

export function FilterConfig({ channels }: FilterConfigProps) {
  const channelsWithFilters = channels.filter(ch => ch.filters.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-white mb-2">Channel Filters</h2>
        <p className="text-slate-400">View filters configured for each channel</p>
      </div>

      <div className="space-y-4">
        {channelsWithFilters.map(channel => (
          <Card key={channel.channelId} className="bg-slate-900/50 border-slate-800 p-6">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Hash className="w-5 h-5 text-blue-400" />
                <h3 className="text-white text-lg">{channel.name}</h3>
                <Badge className="bg-slate-700/50 text-slate-400 border-slate-600 text-xs">
                  Mode: {channel.filterMode}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              {channel.filters.map(filter => (
                <div
                  key={filter.id}
                  className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      className={
                        filter.mode === 'allow'
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }
                    >
                      {filter.mode}
                    </Badge>
                    <span className="text-slate-300">
                      {filterTypeLabels[filter.type] ?? filter.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {filter.values.map(value => (
                      <Badge key={value} className="bg-slate-800 text-slate-300 border-slate-700">
                        {value}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}

        {channelsWithFilters.length === 0 && (
          <Card className="bg-slate-900/50 border-slate-800 p-12 text-center">
            <Filter className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">No filters configured</p>
            <p className="text-slate-500 text-sm">
              Add filters through the bot commands to control which messages get published
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
