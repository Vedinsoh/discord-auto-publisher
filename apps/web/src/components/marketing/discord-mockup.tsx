import { Bell, Hash } from 'lucide-react';

export function DiscordMockup() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          See Auto Publisher in Action
        </h2>
        <p className="text-slate-400 text-lg">
          Messages are automatically published to all following servers
        </p>
      </div>

      <div className="relative max-w-4xl mx-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-slate-950 border-b border-slate-800 px-4 sm:px-6 py-4 flex items-center gap-3">
            <div className="bg-blue-500/10 p-2 rounded">
              <Hash className="w-5 h-5 text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-white font-medium">announcements</div>
              <div className="text-slate-500 text-sm truncate">
                Server announcements and updates
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-blue-400 text-sm bg-blue-500/10 px-3 py-1.5 rounded-full">
              <Bell className="w-4 h-4" />
              <span>Following</span>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="flex gap-3 sm:gap-4">
              <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-blue-600 rounded-full shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-white font-medium">Server Admin</span>
                  <span className="text-xs text-slate-500">Today at 12:00 PM</span>
                </div>
                <p className="text-slate-300 mb-3">
                  We&apos;ve just launched our new features! Check out the latest updates and
                  improvements to the server.
                </p>
                <div className="flex items-center gap-2 text-blue-400 text-sm">
                  <Bell className="w-4 h-4" />
                  <span>Published to 1,234 servers</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-linear-to-r from-blue-500/10 to-purple-500/10 border-t border-blue-500/20 px-4 sm:px-6 py-3 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <span className="text-blue-300 text-sm">Auto-published by Auto Publisher</span>
          </div>
        </div>

        <div className="absolute -top-4 -right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg shadow-blue-500/50 hidden lg:block text-sm font-medium">
          Instant
        </div>
        <div className="absolute -bottom-4 -left-4 bg-purple-500 text-white px-4 py-2 rounded-lg shadow-lg shadow-purple-500/50 hidden lg:block text-sm font-medium">
          Automatic
        </div>
      </div>
    </section>
  );
}
