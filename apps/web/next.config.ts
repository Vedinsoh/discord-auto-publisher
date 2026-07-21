import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/help',
        destination: '/how-it-works',
        permanent: true,
      },
    ];
  },
  experimental: {
    // Client Router Cache reuse for dynamic routes (default 0 = refetch every
    // navigation). 60s makes returning to an already-opened guild instant with
    // no server hop, per-browser so there is no cross-user exposure. Mutations
    // call router.refresh() which busts this cache, so edits still reflect
    // immediately; the invite-return refresh (useRefreshOnReturn) keeps the
    // guild list fresh. See ADR 0007.
    staleTimes: {
      dynamic: 60,
    },
  },
};

export default nextConfig;
