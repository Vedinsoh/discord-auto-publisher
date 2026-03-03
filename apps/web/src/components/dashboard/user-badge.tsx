'use client';

import { LogOut } from 'lucide-react';
import Image from 'next/image';
import { signOut } from 'next-auth/react';
import type { DashboardUser } from './guild-context';

interface UserBadgeProps {
  user: DashboardUser;
}

export function UserBadge({ user }: UserBadgeProps) {
  return (
    <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 rounded-lg px-4 py-3">
      {user.image ? (
        <Image src={user.image} alt="Avatar" width={40} height={40} className="rounded-full" />
      ) : (
        <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-semibold">
            {user.name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <div>
        <p className="text-white text-sm">@{user.username}</p>
      </div>
      <button
        type="button"
        onClick={() => signOut({ redirectTo: '/' })}
        className="ml-2 text-slate-500 hover:text-slate-300 transition-colors"
        title="Sign out"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}
